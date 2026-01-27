"use server";

import { actionClient } from "../actionClient";
import { db } from "../db";
import { lwEvents } from "../schema";
import { createLWEventSchema } from "./lwEventHelpers";
import { getCurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";

export const createLWEventAction = actionClient
  .inputSchema(createLWEventSchema)
  .action(async ({ parsedInput: data }) => {
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
  });
