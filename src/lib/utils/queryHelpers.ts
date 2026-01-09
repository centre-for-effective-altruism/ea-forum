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
