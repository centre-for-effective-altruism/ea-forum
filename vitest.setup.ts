import { pushSchema } from "drizzle-kit/api-postgres";
import { beforeAll, vi } from "vitest";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { postgresExtensions } from "@/lib/postgresExtensions";
import { postgresFunctions } from "@/lib/postgresFunctions";
import { createUniquePostUpvotersQuery } from "@/lib/postgresViews";

// server-only breaks vitest if not mocked
vi.mock("server-only", () => {
  return {};
});

// "use cache" is ignored outside of Next, but these throw without the Next
// runtime, so they're no-ops in tests
vi.mock(import("next/cache"), async (importOriginal) => ({
  ...(await importOriginal()),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

beforeAll(async () => {
  await Promise.all(
    postgresExtensions.map((extension) =>
      db.execute(`CREATE EXTENSION IF NOT EXISTS ${extension} CASCADE`),
    ),
  );

  // Push the database schema to the in-memory test DB
  const { apply } = await pushSchema(schema, db);
  await apply();

  await Promise.all([
    ...postgresFunctions.map((func) => db.execute(func.source)),
    db.execute(createUniquePostUpvotersQuery),
  ]);
});
