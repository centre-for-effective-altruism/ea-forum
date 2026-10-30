import type { estypes } from "@elastic/elasticsearch";
import {
  IndexConfig,
  Ranking,
  isFullTextField,
  fieldHasSubfield,
  indexToCollectionName,
  collectionNameToConfig,
} from "./ElasticConfig";
import type { SearchIndexCollectionName } from "./elasticIndexes";
import { parseQuery, QueryToken } from "./parseElasticQuery";
import { getElasticOriginDate } from "./elasticSettings";

type Sort = estypes.Sort;
type SearchRequest = estypes.SearchRequest;
type QueryDslQueryContainer = estypes.QueryDslQueryContainer;
type Script = estypes.Script;

export type QueryFilterOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export type QueryFilter = {
  field: string;
} & (
  | {
      type: "facet";
      value: boolean | string | null;
      negated: boolean;
    }
  | {
      type: "numeric";
      value: number;
      op: QueryFilterOperator;
    }
  | {
      type: "exists";
    }
);

export type QueryData = {
  index: string;
  sorting?: string;
  search: string;
  offset?: number;
  limit?: number;
  preTag?: string;
  postTag?: string;
  filters: QueryFilter[];
  // Providing coordinates will trigger a special case, which sorts results by
  // distance and ignores relevance
  coordinates?: number[];
};

export type Fuzziness = "AUTO" | number;

type CompiledQuery = {
  tokens: QueryToken[];
  searchQuery: QueryDslQueryContainer;
  snippetName: string;
  snippetQuery?: QueryDslQueryContainer;
  highlightName?: string;
  highlightQuery?: QueryDslQueryContainer;
};

/**
 * Matches the `fm_compact_keyword` normalizer used by `.compact` subfields
 */
export const toCompactKeyword = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

class ElasticQuery {
  private collectionName: SearchIndexCollectionName;
  private config: IndexConfig;

  constructor(
    private queryData: QueryData,
    private fuzziness: Fuzziness = "AUTO",
  ) {
    this.collectionName = indexToCollectionName(queryData.index);
    this.config = collectionNameToConfig(this.collectionName);
  }

  compileRanking({ field, order, weight, scoring }: Ranking): string {
    let expr: string;
    switch (scoring.type) {
      case "numeric":
        const min = scoring.min ?? 1;
        expr = `saturation(Math.max(${min}, doc['${field}'].value), ${scoring.pivot}L)`;
        break;
      case "date":
        // Ranges from 1 for documents created now to 0.5 for documents created
        // at the origin date
        expr = `decayDateLinear(params.now, params.dateScale, '0', 0.5, doc['${field}'].value)`;
        break;
      case "bool":
        expr = `doc['${field}'].value == true ? 0.75 : 0.25`;
        break;
    }
    if (weight) {
      expr = `((${expr}) * ${weight})`;
    }
    expr = `(doc['${field}'].size() == 0 ? 0 : (${expr}))`;
    return order === "asc" ? `(1 - ${expr})` : expr;
  }

  private compileScoreScript(): Script {
    let source = "_score";
    for (const ranking of this.config.ranking ?? []) {
      source += " * " + this.compileRanking(ranking);
    }
    const now = new Date();
    const dayRange = Math.ceil(
      (now.getTime() - getElasticOriginDate().getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      source,
      params: {
        now: now.toISOString(),
        dateScale: `${dayRange}d`,
      },
    };
  }

  private compileFacet(
    field: string,
    value: boolean | string | null,
    negated: boolean,
  ): QueryDslQueryContainer {
    if (value === null) {
      const term: QueryDslQueryContainer = {
        exists: {
          field,
        },
      };
      return negated
        ? term
        : {
            bool: {
              should: [],
              must_not: [term],
            },
          };
    }

    const term: QueryDslQueryContainer = isFullTextField(this.collectionName, field)
      ? {
          match: {
            [`${field}.exact`]: {
              query: value,
              analyzer: "fm_exact_analyzer",
              operator: "AND",
              fuzziness: 0,
            },
          },
        }
      : {
          term: {
            [field]: value,
          },
        };
    return negated
      ? {
          bool: {
            should: [],
            must_not: [term],
          },
        }
      : term;
  }

  private compileFilterTermForField(filter: QueryFilter): QueryDslQueryContainer {
    switch (filter.type) {
      case "facet":
        return this.compileFacet(filter.field, filter.value, filter.negated);

      case "numeric":
        return {
          range: {
            [filter.field]: {
              [filter.op]: filter.value,
            },
          },
        };

      case "exists":
        return {
          bool: {
            should: [],
            must: [
              {
                exists: {
                  field: filter.field,
                },
              },
            ],
          },
        };

      default:
        return {};
    }
  }

  private compileFilters(tokens: QueryToken[]) {
    const filtersByField: Record<string, QueryFilter[]> = {};
    for (const filter of this.queryData.filters) {
      filtersByField[filter.field] ??= [];
      filtersByField[filter.field].push(filter);
    }

    const terms = [...(this.config.filters ?? [])];

    for (const filterField in filtersByField) {
      const filters = filtersByField[filterField];
      if (!filters.length) {
        continue;
      }
      const fieldTerms = filters.map((filter) =>
        this.compileFilterTermForField(filter),
      );
      if (fieldTerms.length > 1) {
        terms.push({
          bool: {
            should: fieldTerms,
          },
        });
      } else {
        terms.push(fieldTerms[0]);
      }
    }

    const userFilters: QueryDslQueryContainer[] = [];
    const tagFilters: QueryDslQueryContainer[] = [];
    for (const { type, token } of tokens) {
      if (type === "user") {
        userFilters.push(
          { term: { "authorSlug.sort": token } },
          { term: { "authorDisplayName.sort": token } },
          { term: { userId: token } },
        );
      } else if (type === "tag") {
        tagFilters.push(
          { term: { "tags._id": token } },
          { term: { "tags.slug": { value: token, case_insensitive: true } } },
          { term: { "tags.name": { value: token, case_insensitive: true } } },
        );
      }
    }
    if (userFilters.length) {
      terms.push({ bool: { should: userFilters } });
    }
    if (tagFilters.length) {
      terms.push({ bool: { should: tagFilters } });
    }

    return terms.length ? terms : undefined;
  }

  /**
   * Fuzzy full text search across all of the fields: queries with up to 2
   * terms must match all of them, longer queries may miss up to 25% of them
   */
  private getDefaultQuery(search: string, fields: string[]): QueryDslQueryContainer {
    return {
      multi_match: {
        query: search,
        fields,
        type: "best_fields",
        tie_breaker: 0.3,
        fuzziness: this.fuzziness,
        max_expansions: 50,
        prefix_length: 1,
        minimum_should_match: "2<-25%",
      },
    };
  }

  private getFieldsWithSubfield(subfieldName: string): string[] {
    return this.config.fields
      .filter((field) =>
        fieldHasSubfield(this.collectionName, field.split("^")[0], subfieldName),
      )
      .map((field) => this.textFieldToSubfield(field, subfieldName));
  }

  private getCompactQueries(search: string): QueryDslQueryContainer[] {
    const value = toCompactKeyword(search);
    if (!value) {
      return [];
    }
    return this.getFieldsWithSubfield("compact").flatMap((field) => {
      const [fieldName, relevance] = field.split("^");
      const boost = Number(relevance ?? 1);
      return [
        { term: { [fieldName]: { value, boost: 10 * boost } } },
        { prefix: { [fieldName]: { value, boost: 3 * boost } } },
      ];
    });
  }

  /**
   * The fuzzy full text query provides recall. The other clauses are different
   * views of the same precise match (eg; a title containing the exact phrase
   * also matches its words and prefixes), so they're combined with `dis_max`
   * to score each document by its best precise match instead of summing them.
   * Summing them would let a title mentioning a name outrank a document by
   * that author, which only matches the name once.
   */
  private compileSimpleQuery(tokens: QueryToken[]): CompiledQuery {
    const { fields, snippet, highlight } = this.config;
    const { search } = this.queryData;
    const prefixFields = this.getFieldsWithSubfield("prefix");
    return {
      tokens,
      searchQuery: {
        bool: {
          should: [
            {
              term: {
                objectID: {
                  value: search,
                },
              },
            },
            this.getDefaultQuery(search, fields),
            {
              dis_max: {
                tie_breaker: 0.1,
                queries: [
                  {
                    multi_match: {
                      query: search,
                      fields: fields.map((field) =>
                        this.textFieldToSubfield(field, "exact"),
                      ),
                      operator: "and",
                      boost: 2,
                    },
                  },
                  {
                    multi_match: {
                      query: search,
                      fields,
                      type: "phrase",
                      slop: 2,
                      boost: 4,
                    },
                  },
                  {
                    match_phrase_prefix: {
                      [this.textFieldToSubfield(fields[0], "exact", false)]: {
                        query: search,
                        boost: 4,
                      },
                    },
                  },
                  ...(prefixFields.length
                    ? [
                        {
                          multi_match: {
                            query: search,
                            fields: prefixFields,
                            operator: "and" as const,
                            boost: 2,
                          },
                        },
                      ]
                    : []),
                  ...this.getCompactQueries(search),
                ],
              },
            },
          ],
        },
      },
      snippetName: snippet,
      highlightName: highlight,
    };
  }

  private textFieldToSubfield(
    textField: string,
    subfieldName: string,
    keepRelevance = true,
  ): string {
    const [fieldName, relevance] = textField.split("^");
    const subfield = `${fieldName}.${subfieldName}`;
    return relevance && keepRelevance ? `${subfield}^${relevance}` : subfield;
  }

  private getAdvancedHighlightQuery(
    mustToken: string,
  ): Omit<CompiledQuery, "searchQuery"> {
    const { snippet, highlight } = this.config;
    const snippetName = `${snippet}.exact`;
    const highlightName = `${highlight}.exact`;
    const buildQuery = (fieldName: string) => ({
      match_phrase: {
        [fieldName]: {
          query: mustToken,
          analyzer: "simple",
        },
      },
    });
    return {
      tokens: [{ type: "must", token: mustToken }],
      snippetName,
      snippetQuery: buildQuery(snippetName),
      ...(highlight && {
        highlightName,
        highlightQuery: buildQuery(highlightName),
      }),
    };
  }

  private compileAdvancedQuery(tokens: QueryToken[]): CompiledQuery {
    const { fields, snippet, highlight } = this.config;

    const must: QueryDslQueryContainer[] = [];
    const must_not: QueryDslQueryContainer[] = [];
    const should: QueryDslQueryContainer[] = [];

    for (const { type, token } of tokens) {
      switch (type) {
        case "must":
          must.push({
            multi_match: {
              query: token,
              fields: fields.map((field) =>
                this.textFieldToSubfield(field, "exact"),
              ),
              type: "phrase",
            },
          });
          break;
        case "not":
          must_not.push({
            multi_match: {
              query: token,
              fields,
            },
          });
          break;
        case "should":
          should.push(this.getDefaultQuery(token, fields));
          break;
        case "user":
        case "tag":
          // Do nothing - this is handled by `this.compileFilters`
          break;
      }
    }

    const searchQuery: QueryDslQueryContainer = {
      bool: {
        must,
        must_not,
        should,
      },
    };

    if (must.length) {
      return {
        searchQuery,
        ...this.getAdvancedHighlightQuery(must[0].multi_match!.query),
      };
    }

    const highlightQueryString = tokens
      .filter(({ type }) => type !== "user" && type !== "tag")
      .map(({ token }) => token)
      .join(" ");
    const highlightQuery = this.getDefaultQuery(
      highlightQueryString,
      this.config.fields,
    );

    return {
      tokens,
      searchQuery,
      snippetName: snippet,
      snippetQuery: highlightQuery,
      highlightName: highlight,
      highlightQuery,
    };
  }

  private compileEmptyQuery(): CompiledQuery {
    return {
      tokens: [],
      searchQuery: {
        match_all: {},
      },
      snippetName: "",
    };
  }

  private compileQuery(): CompiledQuery {
    const { search } = this.queryData;
    if (!search) {
      return this.compileEmptyQuery();
    }
    const { tokens, isAdvanced } = parseQuery(search);
    return isAdvanced
      ? this.compileAdvancedQuery(tokens)
      : this.compileSimpleQuery(tokens);
  }

  private compileSort(sorting?: string, coordinates?: number[]): Sort {
    // Special case:
    // When providing coordinates in the format [lng, lat], we sort by distance
    // and ignore the relevance score. See also parseLatLng()
    if (coordinates) {
      if (!this.config.locationField) {
        throw new Error("Index cannot be sorted by location");
      }
      return [
        {
          _geo_distance: {
            [this.config.locationField]: coordinates,
            order: "asc",
          },
        },
        { [this.config.tiebreaker]: { order: "desc" } },
      ];
    }

    const sort: Sort = [{ [this.config.tiebreaker]: { order: "desc" } }];

    // If we specify a custom sort (such as from the people directory) then
    // we should ignore the search _score completely when sorting
    if (sorting && sorting.indexOf(":") > 0) {
      const [field, order] = sorting.split(":");
      if (order !== "asc" && order !== "desc") {
        throw new Error("Invalid sorting order");
      }
      sort.unshift({ [field]: { order } });
      return sort;
    } else {
      sort.unshift({ _score: { order: "desc" } });
    }

    // There are several special sortings builtin to the main search page.
    // Note that these are used in conjunction with the search _score
    switch (sorting) {
      case "karma":
        const field = this.config.karmaField ?? "baseScore";
        sort.unshift({ [field]: { order: "desc" } });
        break;
      case "newest_first":
        sort.unshift({ publicDateMs: { order: "desc" } });
        break;
      case "oldest_first":
        sort.unshift({ publicDateMs: { order: "asc" } });
        break;
      case "relevance":
        break;
      default:
        if (sorting) {
          throw new Error("Invalid sorting: " + sorting);
        }
    }

    return sort;
  }

  compile(): SearchRequest {
    const {
      preTag,
      postTag,
      index,
      sorting,
      offset = 0,
      limit = 10,
      coordinates,
    } = this.queryData;
    const { privateFields } = this.config;

    // When sorting by nearest-geographically we disable custom highlighting as
    // this isn't supported by elastic and causes an exception
    const hasCustomHighlight = !coordinates;

    const {
      tokens,
      searchQuery,
      snippetName,
      snippetQuery,
      highlightName,
      highlightQuery,
    } = this.compileQuery();
    const highlightConfig = {
      type: "plain",
      pre_tags: [preTag ?? "<em>"],
      post_tags: [postTag ?? "</em>"],

      // This is the default value for index.highlight.max_analyzed_offset
      // which we haven't customized. If this wasn't set here or was set
      // larger than the corresponding setting on the index, then search
      // would fail entirely when results contain a poss where the
      // plain-text version of the body is larger than this.
      max_analyzed_offset: 1000000,
    };
    return {
      index,
      from: offset,
      size: limit,
      track_scores: true,
      track_total_hits: true,
      ...(hasCustomHighlight && {
        highlight: {
          fields: {
            [snippetName]: {
              ...highlightConfig,
              highlight_query: snippetQuery,
            },
            ...(highlightName && {
              [highlightName]: {
                ...highlightConfig,
                highlight_query: highlightQuery,
              },
            }),
          },
          number_of_fragments: 1,
          fragment_size: 140,
          no_match_size: 140,
        },
      }),
      query: {
        script_score: {
          query: {
            bool: {
              must: searchQuery,
              should: [],
              filter: this.compileFilters(tokens),
            },
          },
          script: this.compileScoreScript(),
        },
      },
      sort: this.compileSort(sorting, coordinates),
      _source: {
        excludes: ["exportedAt", ...privateFields],
      },
    };
  }
}

export default ElasticQuery;
