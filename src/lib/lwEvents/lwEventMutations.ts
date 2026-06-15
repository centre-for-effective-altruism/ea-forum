import type { CreateLWEvent } from "./lwEventHelpers";
import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { lwEvents } from "../schema";
import { randomId } from "../utils/random";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";
import { sendIntercomEvent } from "./lwEventCallbacks";

export const createLWEvent = async (
  currentUser: CurrentUser | null,
  data: CreateLWEvent,
) => {
  const [[lwEvent]] = await Promise.all([
    // Create the LWEvent
    db
      .insert(lwEvents)
      .values({
        _id: randomId(),
        userId: currentUser?._id,
        ...data,
      })
      .returning(),
    // Update post read status
    currentUser && data.documentId && data.name === "post-view"
      ? upsertReadStatus({
          postId: data.documentId,
          userId: currentUser._id,
          updateIsReadIfAlreadyExists: true,
        })
      : null,
  ]);
  await sendIntercomEvent(currentUser, lwEvent);
};
