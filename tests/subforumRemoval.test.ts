import { expect, suite, test } from "vitest";
import { createTestComment, createTestTag, createTestUser } from "./testHelpers";
import {
  newCommentNotifications,
  updateCommentTag,
} from "@/lib/comments/commentCallbacks";
import { fetchNotificationDisplays } from "@/lib/notifications/fetchNotificationDisplays";
import { getNotificationDocumentSummary } from "@/lib/notifications/notificationQueries";
import { notifications, userTagRels } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { db } from "@/lib/db";

suite("Subforum removal", () => {
  test("Legacy subforum comments don't update subforum fields or notify members", async () => {
    const tag = await createTestTag();
    const member = await createTestUser({ profileTagIds: [tag._id] });
    await db.insert(userTagRels).values({
      _id: randomId(),
      tagId: tag._id,
      userId: member._id,
      subforumEmailNotifications: true,
    });
    const comment = await createTestComment({
      tagId: tag._id,
      tagCommentType: "SUBFORUM",
    });

    await db.transaction((txn) => updateCommentTag(txn, comment));
    await newCommentNotifications(comment._id);

    const updatedTag = await db.query.tags.findFirst({
      columns: { lastSubforumCommentAt: true, lastCommentedAt: true },
      where: { _id: tag._id },
    });
    expect(updatedTag?.lastSubforumCommentAt).toBeNull();
    expect(updatedTag?.lastCommentedAt).not.toBeNull();

    const memberNotifications = await db.query.notifications.findMany({
      where: { userId: member._id },
    });
    expect(memberNotifications).toHaveLength(0);
  });

  test("Existing subforum comment notifications still display and link to the topic", async () => {
    const tag = await createTestTag();
    const user = await createTestUser();
    const comment = await createTestComment({
      tagId: tag._id,
      tagCommentType: "SUBFORUM",
    });
    const link = `/topics/${tag.slug}?commentId=${comment._id}`;
    await db.insert(notifications).values({
      _id: randomId(),
      userId: user._id,
      type: "newSubforumComment",
      documentType: "comment",
      documentId: comment._id,
      link,
      message: "Test subforum notification",
    });

    const displays = await fetchNotificationDisplays({ userId: user._id });
    expect(displays).toHaveLength(1);
    expect(displays[0].type).toBe("newSubforumComment");
    expect(displays[0].link).toBe(link);

    const summary = await getNotificationDocumentSummary("comment", comment._id);
    expect(summary?.link).toBe(link);
  });
});
