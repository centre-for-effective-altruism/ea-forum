import { sql } from "drizzle-orm";
import { cache } from "react";
import { cacheLife } from "next/cache";
import { db } from "../db";
import { shortCacheLife } from "../cacheLifetimes";
import { z } from "zod/v4";

const timeSeriesSchema = z.object({
  start: z.int().nonnegative(),
  interval: z.int().positive(),
  values: z.number().nullable().array(),
});

type TimeSeries = z.infer<typeof timeSeriesSchema>;

const valuesToSql = (values: (number | null)[]) =>
  sql`(ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )}]::DOUBLE PRECISION[])`;

// A long interval keeps the array index generated in SQL in range
const defaultKarmaInflationSeries: TimeSeries = {
  start: 0,
  interval: 1000 * 60 * 60 * 24 * 365,
  values: [1],
};

const fetchKarmaInflationSeries = async (): Promise<TimeSeries> => {
  "use cache";
  const result = await db.query.databaseMetadata.findFirst({
    columns: {
      value: true,
    },
    where: {
      name: "karmaInflationSeries",
    },
  });
  const parseResult = timeSeriesSchema.safeParse(result?.value);
  if (!parseResult.success) {
    console.error("Invalid karma inflation series");
    // Retry soon rather than caching the fallback for a whole day
    cacheLife(shortCacheLife);
    return defaultKarmaInflationSeries;
  }
  cacheLife("days");
  return parseResult.data;
};

// The SQL can't be stored in the "use cache" cache, so it's built per-request
export const getKarmaInflationSeries = cache(async () => {
  const series = await fetchKarmaInflationSeries();
  return { ...series, valuesSql: valuesToSql(series.values) };
});
