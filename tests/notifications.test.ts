import { suite, test, expect } from "vitest";
import { createTestUser } from "./testHelpers";
import { userCheckNotifications } from "@/lib/users/userMutations";
import { fetchUnreadNotificationCount } from "@/lib/notifications/fetchNotificationDisplays";
import { currentUserProjection } from "@/lib/users/currentUser";
import { randomId } from "@/lib/utils/random";
import { notifications } from "@/lib/schema";
import { db } from "@/lib/db";

suite("Unread notifications count", () => {
  const getCurrentUser = async (_id: string) => {
    const user = await db.query.users.findFirst({
      ...currentUserProjection,
      where: { _id },
    });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  };

  const createNotification = (userId: string) =>
    db.insert(notifications).values({
      _id: randomId(),
      userId,
      type: "newComment",
      message: "Test notification",
    });

  test("uses server time when checking notifications", async () => {
    const user = await createTestUser();
    const before = Date.now();
    await userCheckNotifications({
      currentUser: await getCurrentUser(user._id),
      hasKarmaChanges: false,
      endDate: new Date(),
    });
    const after = Date.now();
    const { lastNotificationsCheck } = await getCurrentUser(user._id);
    const checkedAt = new Date(lastNotificationsCheck!).getTime();
    expect(checkedAt).toBeGreaterThanOrEqual(before);
    expect(checkedAt).toBeLessThanOrEqual(after);
  });

  test("counts notifications created after the last check", async () => {
    const user = await createTestUser();
    await createNotification(user._id);
    await userCheckNotifications({
      currentUser: await getCurrentUser(user._id),
      hasKarmaChanges: false,
      endDate: new Date(),
    });
    expect(await fetchUnreadNotificationCount(await getCurrentUser(user._id))).toBe(
      0,
    );
    await createNotification(user._id);
    expect(await fetchUnreadNotificationCount(await getCurrentUser(user._id))).toBe(
      1,
    );
  });
});
