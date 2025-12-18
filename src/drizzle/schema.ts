import "server-only";
import { sql } from "drizzle-orm";
import {
  pgTable,
  index,
  varchar,
  timestamp as rawTimestamp,
  text,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

const timestamp = () => rawTimestamp({ withTimezone: true, mode: "string" });
const timestampDefaultNow = () => timestamp().default(sql`CURRENT_TIMESTAMP`);

const universalFields = {
  schemaVersion: doublePrecision().default(1),
  createdAt: timestampDefaultNow(),
  legacyData: jsonb(),
};

export const bans = pgTable(
  "Bans",
  {
    ...universalFields,
    id: varchar("_id", { length: 27 }).primaryKey().notNull(),
    expirationDate: timestamp(),
    userId: varchar({ length: 27 }).notNull(),
    ip: text(),
    reason: text(),
    comment: text().default("").notNull(),
    properties: jsonb(),
  },
  (table) => [
    index("idx_Bans_ip").using("btree", table.ip.asc().nullsLast().op("text_ops")),
    index("idx_Bans_schemaVersion").using(
      "btree",
      table.schemaVersion.asc().nullsLast().op("float8_ops"),
    ),
  ],
);
