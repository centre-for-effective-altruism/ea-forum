import { os } from "@orpc/server";
import { db } from "../db";
import { lwEvents } from "../schema";
import { createLWEventSchema } from "./lwEventHelpers";
import { getCurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";

export const lwEventRouter = {
  create: os.input(createLWEventSchema).handler(async ({ input: data }) => {
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
  }),
};
