import type { CurrentUser } from "../users/currentUser";
import type { SubscriptionType } from "./subscriptionTypes";
import { db } from "../db";
import { subscriptions } from "../schema";
import { and, eq } from "drizzle-orm";
import { randomId } from "../utils/random";

export const fetchSubscription = async ({
  currentUser,
  collectionName,
  documentId,
  type,
}: {
  currentUser: CurrentUser;
  collectionName: string;
  documentId: string;
  type: SubscriptionType;
}): Promise<{ subscribed: boolean }> => {
  const sub = await db.query.subscriptions.findFirst({
    columns: {
      state: true,
    },
    where: {
      userId: currentUser._id,
      collectionName,
      documentId,
      type,
      deleted: false,
    },
  });
  return { subscribed: sub?.state === "subscribed" };
};

export const updateSubscription = async ({
  currentUser,
  collectionName,
  documentId,
  type,
  subscribed,
}: {
  currentUser: CurrentUser;
  collectionName: string;
  documentId: string;
  type: SubscriptionType;
  subscribed: boolean;
}) => {
  await db.transaction(async (txn) => {
    await txn
      .update(subscriptions)
      .set({ deleted: true })
      .where(
        and(
          eq(subscriptions.collectionName, collectionName),
          eq(subscriptions.documentId, documentId),
          eq(subscriptions.type, type),
          eq(subscriptions.userId, currentUser._id),
        ),
      );
    await txn.insert(subscriptions).values({
      _id: randomId(),
      collectionName,
      documentId,
      type,
      userId: currentUser._id,
      state: subscribed ? "subscribed" : "suppressed",
    });
  });
  return { subscribed };
};
