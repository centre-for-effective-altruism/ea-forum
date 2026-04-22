import { captureException } from "@sentry/nextjs";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const GET = async () => {
  try {
    const result = await db.execute<{ value: number }>(sql`SELECT 0 AS "value"`);
    const value = result.rows[0]?.value;
    if (value !== 0) {
      throw new Error(`Unexpected db check value: ${value}`);
    }
    return Response.json({ healthy: true }, { status: 200 });
  } catch (e) {
    captureException(e);
    return Response.json({ healthy: false }, { status: 500 });
  }
};
