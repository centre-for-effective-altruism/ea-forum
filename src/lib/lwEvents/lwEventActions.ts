"use server";

import type { JsonRecord } from "../typeHelpers";
import { db } from "../db";
import { lwEvents, InsertLWEvent } from "../schema";
import { getCurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";

export type CreateLWEvent = Omit<InsertLWEvent, "_id" | "userId" | "properties"> & {
  properties?: JsonRecord;
};

export const createLWEventAction = async (data: CreateLWEvent) => {
  const currentUser = await getCurrentUser();
  await Promise.all([
    // Create the LWEvent
    db.insert(lwEvents).values({
      _id: randomId(),
      userId: currentUser?._id,
      ...data,
    }),
    // Update post read status
    currentUser && data.documentId && data.name === "post-view"
      ? upsertReadStatus({
          postId: data.documentId,
          userId: currentUser._id,
          updateIsReadIfAlreadyExists: true,
        })
      : null,
  ]);

  // TODO: updatePartiallyReadSequences and sendIntercomEvent
};
