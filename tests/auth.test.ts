import { expect, suite, test, vi } from "vitest";
import {
  auth0IdTokenToProfile,
  getOrCreateUser,
  userCanChangeEmail,
} from "@/lib/authHelpers";
import { createTestUser } from "./testHelpers";
import { nYearsFromNow } from "@/lib/timeUtils";
import { randomId } from "@/lib/utils/random";
import { db } from "@/lib/db";

vi.mock("@/lib/mailchimp", () => ({
  updateMailchimpSubscription: vi.fn().mockResolvedValue(undefined),
}));

suite("Auth", () => {
  suite("getOrCreateNewUser", () => {
    test("Can create new user", async () => {
      const auth0UserId = randomId();
      const profile = {
        id: auth0UserId,
        user_id: auth0UserId,
        raw: "{}",
        _json: {},
        name: {},
        emails: [
          {
            value: "create-new-user@example.com",
          },
        ],
        picture: "",
        displayName: "Test user",
        nickname: "Test user",
        provider: "auth0",
      };
      const result = await getOrCreateUser("test-client-id", profile);
      expect(result?._id).toBeTruthy();
      const user = await db.query.users.findFirst({
        where: {
          _id: result._id,
        },
      });
      expect(user).not.toBeNull();
      expect(user?.services?.auth0).toStrictEqual(profile);
      expect(user?.displayName).toBe(profile.displayName);
      expect(user?.slug).toBe("test-user");
    });
    test("Gets existing user (with auth0 profile)", async () => {
      const auth0UserId = randomId();
      const existingUser = await createTestUser({
        services: {
          auth0: {
            id: auth0UserId,
          },
        },
      });
      const profile = {
        id: auth0UserId,
        user_id: auth0UserId,
        raw: "{}",
        _json: {},
        name: {},
        emails: [
          {
            value: "user-with-auth0-profile@example.com",
          },
        ],
        picture: "",
        displayName: "Test user",
        nickname: "Test user",
        provider: "auth0",
      };
      const result = await getOrCreateUser("test-client-id", profile);
      expect(result?._id).toBeTruthy();
      const user = await db.query.users.findFirst({
        where: {
          _id: result._id,
        },
      });
      expect(user).not.toBeNull();
      expect(user?._id).toBe(existingUser?._id);
      // TODO Check that email is updated
    });
    test("Gets existing user (no auth0 profile)", async () => {
      const auth0UserId = randomId();
      const existingUser = await createTestUser({
        email: "existing-no-profile@example.com",
      });
      const profile = {
        id: auth0UserId,
        user_id: auth0UserId,
        raw: "{}",
        _json: {},
        name: {},
        emails: [
          {
            value: existingUser.email,
          },
        ],
        picture: "",
        displayName: "Test user",
        nickname: "Test user",
        provider: "auth0",
      };
      const result = await getOrCreateUser("test-client-id", profile);
      expect(result?._id).toBeTruthy();
      const user = await db.query.users.findFirst({
        where: {
          _id: result._id,
        },
      });
      expect(user).not.toBeNull();
      expect(user?._id).toBe(existingUser?._id);
      expect(user?.services?.auth0).toStrictEqual(profile);
    });
    test("Gets existing user (no auth0 profile) - case insensitive", async () => {
      const auth0UserId = randomId();
      const existingUser = await createTestUser({
        email: "existing-no-profile-case-insensitive@example.com",
      });
      const profile = {
        id: auth0UserId,
        user_id: auth0UserId,
        raw: "{}",
        _json: {},
        name: {},
        emails: [
          {
            value: existingUser.email!.toUpperCase(),
          },
        ],
        picture: "",
        displayName: "Test user",
        nickname: "Test user",
        provider: "auth0",
      };
      const result = await getOrCreateUser("test-client-id", profile);
      expect(result?._id).toBeTruthy();
      const user = await db.query.users.findFirst({
        where: {
          _id: result._id,
        },
      });
      expect(user).not.toBeNull();
      expect(user?._id).toBe(existingUser?._id);
      expect(user?.services?.auth0).toStrictEqual(profile);
    });
    test("Throws if mulitple users are found", async () => {
      await Promise.all([
        createTestUser({ email: "collision@example.com" }),
        createTestUser({ email: "collision@example.com" }),
      ]);
      const auth0UserId = randomId();
      const profile = {
        id: auth0UserId,
        user_id: auth0UserId,
        raw: "{}",
        _json: {},
        name: {},
        emails: [
          {
            value: "collision@example.com",
          },
        ],
        picture: "",
        displayName: "Test user",
        nickname: "Test user",
        provider: "auth0",
      };
      await expect(async () => {
        await getOrCreateUser("test-client-id", profile);
      }).rejects.toThrowError();
    });
    test("Throws if banned", async () => {
      await createTestUser({
        email: "banned@example.com",
        banned: nYearsFromNow(1).toISOString(),
      });
      const auth0UserId = randomId();
      const profile = {
        id: auth0UserId,
        user_id: auth0UserId,
        raw: "{}",
        _json: {},
        name: {},
        emails: [
          {
            value: "banned@example.com",
          },
        ],
        picture: "",
        displayName: "Test user",
        nickname: "Test user",
        provider: "auth0",
      };
      await expect(async () => {
        await getOrCreateUser("test-client-id", profile);
      }).rejects.toThrowError();
    });
  });

  test("only password logins can change their email", () => {
    const withAuth0Id = (id: string) => ({
      services: { auth0: { id, user_id: id, provider: "auth0" } },
    });
    expect(userCanChangeEmail(withAuth0Id("auth0|123"))).toBe(true);
    expect(userCanChangeEmail(withAuth0Id("google-oauth2|123"))).toBe(false);
    expect(userCanChangeEmail({ services: null })).toBe(false);
  });

  test("the stored provider comes from the Auth0 user id", () => {
    const toIdToken = (sub: string) =>
      `header.${Buffer.from(JSON.stringify({ sub })).toString("base64")}.signature`;
    expect(auth0IdTokenToProfile(toIdToken("google-oauth2|123")).provider).toBe(
      "google-oauth2",
    );
    expect(auth0IdTokenToProfile(toIdToken("auth0|123")).provider).toBe("auth0");
  });
});
