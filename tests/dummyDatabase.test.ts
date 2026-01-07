import { expect, suite, test } from "vitest";
import { db } from "@/lib/db";

// This is a dummy test to check pglite it working - remove it once we have a
// real integration test
suite("Dummy database", () => {
  test("can run a query", async () => {
    const result = await db.query.users.findMany();
    expect(result).toHaveLength(0);
  });
});
