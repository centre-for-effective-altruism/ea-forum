import "server-only";
import { PgPostgresClient } from "tradukisto";

let db: PgPostgresClient | null = null;

export const getDbOrThrow = () => {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("No database connection string configured");
    }
    db = new PgPostgresClient(connectionString);
    if (!db) {
      throw new Error("Failed to connect to database");
    }
  }
  return db;
};
