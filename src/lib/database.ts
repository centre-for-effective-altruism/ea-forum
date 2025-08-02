import { PgPostgresClient } from "tradukisto";

let client: PgPostgresClient | null = null;

export const getDatabaseOrThrow = () => {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("No database url configured");
    }
    client = new PgPostgresClient(databaseUrl);
    if (!client) {
      throw new Error("Can't connect to database");
    }
  }
  return client;
}
