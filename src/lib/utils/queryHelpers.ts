import { sql, SQL } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TTableBase = { findMany: (...args: any) => any };

export type RelationalProjection<TTable extends TTableBase> = Partial<
  Pick<NonNullable<Parameters<TTable["findMany"]>[0]>, "columns" | "with" | "extras">
>;

export type RelationalFilter<TTable extends TTableBase> = NonNullable<
  Parameters<TTable["findMany"]>[0]
>["where"];

export type RelationalOrderBy<TTable extends TTableBase> = NonNullable<
  Parameters<TTable["findMany"]>[0]
>["orderBy"];

/**
 * It's common to check nullable boolean fields as "not equal to true" instead
 * of "equal to false", in order to treat a null field as falsy. This is done
 * in Postgres with `"field" IS NOT TRUE` instead of `"field" <> TRUE`, but
 * unfortunately drizzle always compiles to the latter. This helper can be used
 * to force the correct check.
 */
export const isNotTrue = { OR: [{ isNull: true as const }, { eq: false }] };

export const createRawSqlArray = <T>(array: T[], cast?: string) => {
  const sanitizedItems: SQL<unknown>[] = [sql`'{`];
  const rawItems: SQL<unknown>[] = [];
  for (const item of array) {
    rawItems.push(sql.raw(sql`${item}`.queryChunks[1]!.toString()));
  }
  sanitizedItems.push(sql.join(rawItems, sql`, `));
  sanitizedItems.push(sql`}'`);
  if (cast) {
    sanitizedItems.push(sql.raw(`::${cast}[]`));
  }
  return sql.join(sanitizedItems);
};

export const isAnyInArray = <C, T>(column: C, array: T[], cast?: string) =>
  sql<boolean>`${column} = ANY(${createRawSqlArray(array, cast)})`;

/**
 * Given a `field` containing HTML, create a selector to fetch a substring of
 * that HTML of `length` characters. Note that the returned HTML will often
 * not technically be valid as it will be missing closing tags at the end of
 * the string, but browsers can still generally render this fine. This
 * function does guarantee that the end of the resulting string do _not_ end
 * half way through an HTML tag, as that would render incorrectly. An ellipsis
 * is added to the end as well.
 */
export const htmlSubstring = (field: SQL, length = 350) =>
  sql<string>`(REGEXP_REPLACE(SUBSTRING(${field}, 1, ${length}), '<[^>]*$', '') || '...')`;
