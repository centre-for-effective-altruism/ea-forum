import { suite, test, expect } from "vitest";
import { createTestUser } from "./testHelpers";
import { swapUserEmails } from "@/lib/users/userMutations";
import { db } from "@/lib/db";

suite("swapUserEmails", () => {
  const getUser = (_id: string) =>
    db.query.users.findFirst({
      where: {
        _id,
      },
    });

  test("swaps email and emails between two users", async () => {
    const user1 = await createTestUser({
      email: "user1@example.com",
      emails: ["user1@example.com", "user1-alt@example.com"],
    });
    const user2 = await createTestUser({
      email: "user2@example.com",
      emails: ["user2@example.com", "user2-alt@example.com"],
    });
    await swapUserEmails(user1._id, user2._id);
    const updatedUser1 = await getUser(user1._id);
    const updatedUser2 = await getUser(user2._id);
    expect(updatedUser1?.email).toBe(user2.email);
    expect(updatedUser1?.emails).toEqual(user2.emails);
    expect(updatedUser2?.email).toBe(user1.email);
    expect(updatedUser2?.emails).toEqual(user1.emails);
  });
  test("swaps auth0 services while preserving each user's other services", async () => {
    const user1 = await createTestUser({
      email: "user1@example.com",
      services: {
        auth0: {
          userId: "auth0-user-1",
          connection: "connection-1",
        },
        google: {
          userId: "google-user-1",
        },
      },
    });
    const user2 = await createTestUser({
      email: "user2@example.com",
      services: {
        auth0: {
          userId: "auth0-user-2",
          connection: "connection-2",
        },
        github: {
          userId: "github-user-2",
        },
      },
    });
    await swapUserEmails(user1._id, user2._id);
    const updatedUser1 = await getUser(user1._id);
    const updatedUser2 = await getUser(user2._id);
    expect(updatedUser1?.services).toEqual({
      google: {
        userId: "google-user-1",
      },
      auth0: {
        userId: "auth0-user-2",
        connection: "connection-2",
      },
    });
    expect(updatedUser2?.services).toEqual({
      github: {
        userId: "github-user-2",
      },
      auth0: {
        userId: "auth0-user-1",
        connection: "connection-1",
      },
    });
  });
  test("throws when a user does not exist", async () => {
    const user = await createTestUser({
      email: "user@example.com",
    });
    await expect(swapUserEmails("does-not-exist", user._id)).rejects.toThrow(
      "Invalid user ids",
    );
    const unchangedUser = await getUser(user._id);
    expect(unchangedUser?.email).toBe(user.email);
    expect(unchangedUser?.emails).toEqual(user.emails);
    expect(unchangedUser?.services).toEqual(user.services);
  });
  test("throws when the IDs are identical", async () => {
    const user = await createTestUser({
      email: "user@example.com",
    });
    await expect(swapUserEmails(user._id, user._id)).rejects.toThrow(
      "Invalid user ids",
    );
    const unchangedUser = await getUser(user._id);
    expect(unchangedUser?.email).toBe(user.email);
    expect(unchangedUser?.emails).toEqual(user.emails);
    expect(unchangedUser?.services).toEqual(user.services);
  });
  test("does not modify either user when validation fails", async () => {
    const user1 = await createTestUser({
      email: "user1@example.com",
      emails: ["user1@example.com"],
    });
    await expect(swapUserEmails(user1._id, "does-not-exist")).rejects.toThrow(
      "Invalid user ids",
    );
    const updatedUser1 = await getUser(user1._id);
    expect(updatedUser1?.email).toBe(user1.email);
    expect(updatedUser1?.emails).toEqual(user1.emails);
  });
});
