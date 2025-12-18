import "server-only";
import { PgPostgresClient } from "tradukisto";

let tradukistoDb: PgPostgresClient | null = null;

export const getDbOrThrow = () => {
  if (!tradukistoDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("No database connection string configured");
    }
    tradukistoDb = new PgPostgresClient(connectionString);
    if (!tradukistoDb) {
      throw new Error("Failed to connect to database");
    }
  }
  return tradukistoDb;
};
