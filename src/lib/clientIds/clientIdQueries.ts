import { sql } from "drizzle-orm";
import { db } from "../db";
import { clientIds } from "../schema";
import { randomId } from "../utils/random";

export const ensureClientId = async ({
  clientId,
  userId,
  referrer,
  landingPage,
}: {
  clientId: string;
  userId: string | null;
  referrer: string | null;
  landingPage: string;
}) => {
  const now = new Date().toISOString();
  await db
    .insert(clientIds)
    .values({
      _id: randomId(),
      clientId: clientId,
      firstSeenReferrer: referrer,
      firstSeenLandingPage: landingPage,
      lastSeenAt: now,
      timesSeen: 1,
      ...(userId ? { userIds: [userId] } : {}),
    })
    .onConflictDoUpdate({
      target: [clientIds.clientId],
      set: {
        lastSeenAt: now,
        timesSeen: sql`${clientIds.timesSeen} + 1`,
        ...(userId
          ? {
              userIds: sql`fm_add_to_set(${clientIds.userIds}, EXCLUDED."userIds"[1])`,
            }
          : {}),
      },
    })
    .returning();
};
