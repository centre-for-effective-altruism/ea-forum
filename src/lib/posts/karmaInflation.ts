import { SQL, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
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

let karmaInflationSeries: TimeSeries & { valuesSql: SQL } = {
  start: Date.now(),
  interval: 1,
  values: [1],
  valuesSql: valuesToSql([1]),
};
let lastFetchedAt = new Date(0).getTime();
const cacheMaxAgeMs = 1000 * 60 * 60 * 24; // 24 hours

// Even though we manually cache the value here, we also need to react cache to
// ensure that the request that triggers the refresh only even sends one query.
export const getKarmaInflationSeries = cache(async () => {
  const now = Date.now();
  if (now - lastFetchedAt > cacheMaxAgeMs) {
    const result = await db.query.databaseMetadata.findFirst({
      columns: {
        value: true,
      },
      where: {
        name: "karmaInflationSeries",
      },
    });
    if (result?.value) {
      const parseResult = timeSeriesSchema.safeParse(result.value);
      if (parseResult.success) {
        karmaInflationSeries = {
          ...parseResult.data,
          valuesSql: valuesToSql(parseResult.data.values),
        };
        lastFetchedAt = now;
      } else {
        console.error("Invalid karma inflation series");
      }
    }
  }
  return karmaInflationSeries;
});
