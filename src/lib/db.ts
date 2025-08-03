import "server-only";

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./dbTypes";

let db: Kysely<DB> | null = null;

export const getDbOrThrow = () => {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("No database connection string configured");
    }
    db = new Kysely<DB>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
        }),
      }),
      log: ["error"], // Add "query" to log queries for debugging
    });
    if (!db) {
      throw new Error("Failed to connect to database");
    }
  }
  return db;
};

/**
 * Given a db repo class and the name of a method, return the type of the object
 * returned by that method. Whether the method returns a single row or an array
 * of rows, this type will give the type of a single row.
 */
export type RepoQuery<RepoClass, MethodName extends keyof RepoClass> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RepoClass[MethodName] extends (...args: any[]) => infer ReturnedPromise
    ? Awaited<ReturnedPromise> extends Array<infer ArrayType>
      ? ArrayType
      : Awaited<ReturnedPromise>
    : never;
