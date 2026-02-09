import { sql, SQL } from "drizzle-orm";
import type { CurrentUser } from "../users/currentUser";
import type { RecommendationFeatureName } from "./RecommendationStrategy";
import {
  filterModeToAdditiveKarmaModifier,
  filterModeToMultiplicativeKarmaModifier,
  FilterSettings,
  getDefaultFilterSettings,
  resolveFrontpageFilters,
} from "../filterSettings";

abstract class Feature {
  constructor(
    protected currentUser: CurrentUser | null,
    protected postId: string,
  ) {}

  getJoin(): SQL | null {
    return null;
  }

  getFilter(): SQL | null {
    return null;
  }

  getScore(): SQL | null {
    return null;
  }
}

type ConstructableFeature = {
  new (currentUser: CurrentUser | null, postId: string): Feature;
};

class KarmaFeature extends Feature {
  private readonly pivot = 100;

  getScore() {
    return sql`
      CASE WHEN p."baseScore" > 0
        THEN p."baseScore" / (${this.pivot} + p."baseScore")
        ELSE 0
      END
    `;
  }
}

class CuratedFeature extends Feature {
  getScore() {
    return sql`CASE WHEN p."curatedDate" IS NULL THEN 0 ELSE 1 END`;
  }
}

class TagSimilarityFeature extends Feature {
  getScore() {
    return sql`fm_post_tag_similarity(${this.postId}, p."_id")`;
  }
}

class CollabFilterFeature extends Feature {
  constructor(currentUser: CurrentUser | null, postId: string) {
    super(currentUser, postId);
  }

  getJoin() {
    return sql`INNER JOIN "UniquePostUpvoters" rec ON rec."postId" = p."_id"`;
  }

  getScore() {
    const srcVoters = sql`(
      SELECT voters
      FROM "UniquePostUpvoters"
      WHERE "postId" = ${this.postId}
    )`;
    return sql`
      COALESCE(
        (# (${srcVoters} & rec.voters))::FLOAT /
          NULLIF((# (${srcVoters} | rec.voters))::FLOAT, 0),
        0
      )
    `;
  }
}

class TextSimilarityFeature extends Feature {
  constructor(
    currentUser: CurrentUser | null,
    postId: string,
    private model = "text-embedding-ada-002",
  ) {
    super(currentUser, postId);
  }

  getJoin() {
    return sql`
      INNER JOIN "PostEmbeddings" pe ON
        pe."postId" = p."_id" AND
        pe."model" = ${this.model}
      JOIN "PostEmbeddings" seed_embeddings ON
        seed_embeddings."postId" = ${this.postId} AND
        seed_embeddings."model" = ${this.model}
    `;
  }

  getScore() {
    return sql`(-1 * (pe."embeddings" <#> seed_embeddings."embeddings"))`;
  }
}

class SubscribedAuthorPostsFeature extends Feature {
  getJoin() {
    return sql`
      LEFT JOIN "Subscriptions" author_subs ON
        author_subs."collectionName" = 'Users' AND
        author_subs."state" = 'subscribed' AND
        author_subs."deleted" IS NOT TRUE AND
        author_subs."type" = 'newPosts' AND
        author_subs."userId" = $(userId) AND
        (author_subs."documentId" = p."userId" OR
          author_subs."documentId" = ANY(p."coauthorUserIds"))
    `;
  }

  getScore() {
    return sql`(CASE WHEN author_subs."_id" IS NULL THEN 0 ELSE 1 END)`;
  }
}

class SubscribedTagPostsFeature extends Feature {
  getJoin() {
    return sql`
      LEFT JOIN "Subscriptions" tag_subs ON
        tag_subs."collectionName" = 'Tags' AND
        tag_subs."state" = 'subscribed' AND
        tag_subs."deleted" IS NOT TRUE AND
        tag_subs."type" = 'newTagPosts' AND
        tag_subs."userId" = $(userId) AND
        (p."tagRelevance"->tag_subs."documentId")::INTEGER >= 1
    `;
  }

  getScore() {
    return sql`(CASE WHEN tag_subs."_id" IS NULL THEN 0 ELSE 1 END)`;
  }
}

class FrontpageFilterSettingsFeature extends Feature {
  private filterClauses: SQL[] = [];
  private score: SQL;

  constructor(currentUser: CurrentUser | null, postId: string) {
    super(currentUser, postId);

    const filterSettings: FilterSettings =
      (currentUser?.frontpageFilterSettings as FilterSettings) ??
      getDefaultFilterSettings();
    const { tagsRequired, tagsExcluded, tagsSoftFiltered } =
      resolveFrontpageFilters(filterSettings);

    for (const tag of tagsRequired) {
      this.filterClauses.push(
        sql`COALESCE((p."tagRelevance"->${tag.tagId})::INTEGER, 0) >= 1`,
      );
    }
    for (const tag of tagsExcluded) {
      this.filterClauses.push(
        sql`COALESCE((p."tagRelevance"->${tag.tagId})::INTEGER, 0) < 1`,
      );
    }

    const addClauses: SQL[] = [sql`p."baseScore"`];
    const multClauses: SQL[] = [sql`1`];
    for (const tag of tagsSoftFiltered) {
      addClauses.push(sql`(
        CASE
          WHEN COALESCE((p."tagRelevance"->${tag.tagId})::INTEGER, 0) > 0
          THEN ${filterModeToAdditiveKarmaModifier(tag.filterMode)}
          ELSE 0
        END
      )`);
      multClauses.push(sql`(
        CASE
          WHEN COALESCE((p."tagRelevance"->${tag.tagId})::INTEGER, 0) > 0
          THEN ${filterModeToMultiplicativeKarmaModifier(tag.filterMode)}
          ELSE 1
        END
      )`);
    }

    switch (filterSettings.personalBlog) {
      case "Hidden":
        this.filterClauses.push(sql`p."frontpageDate" IS NOT NULL`);
        break;
      case "Required":
        this.filterClauses.push(sql`p."frontpageDate" IS NULL`);
        break;
      default:
        addClauses.push(sql`(
          CASE
            WHEN p."frontpageDate" IS NULL
            THEN 0
            ELSE ${filterModeToAdditiveKarmaModifier(filterSettings.personalBlog)}
          END
        )`);
        break;
    }

    const addClause = sql.join(addClauses, sql`+`);
    const multClause = sql.join(multClauses, sql`*`);
    this.score = sql`((${addClause}) * ${multClause})`;
  }

  getFilter() {
    return sql.join(this.filterClauses, sql` AND `);
  }

  getScore() {
    return this.score;
  }
}

export const featureRegistry: Record<
  RecommendationFeatureName,
  ConstructableFeature
> = {
  karma: KarmaFeature,
  curated: CuratedFeature,
  tagSimilarity: TagSimilarityFeature,
  collabFilter: CollabFilterFeature,
  textSimilarity: TextSimilarityFeature,
  subscribedAuthorPosts: SubscribedAuthorPostsFeature,
  subscribedTagPosts: SubscribedTagPostsFeature,
  frontpageFilterSettings: FrontpageFilterSettingsFeature,
};
