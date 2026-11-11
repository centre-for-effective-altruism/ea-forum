import { afterEach, beforeAll, expect, suite, test, vi } from "vitest";
import { db } from "@/lib/db";
import { sanitizeReturnTo } from "@/lib/routeHelpers";
import {
  createPendingTwoFactorLoginToken,
  decryptTotpSecret,
  encodeBase32,
  findTotpTimeStep,
  generateTotp,
  getTotpTimeStep,
  PENDING_TWO_FACTOR_LOGIN_TTL_SECONDS,
  verifyPendingTwoFactorLoginToken,
} from "@/lib/twoFactorAuth/twoFactorAuthHelpers";
import {
  beginTwoFactorAuthSetup,
  completeTwoFactorLogin,
  confirmTwoFactorAuthSetup,
  disableTwoFactorAuth,
} from "@/lib/twoFactorAuth/twoFactorAuthMutations";
import { fetchUserTwoFactorAuth } from "@/lib/twoFactorAuth/twoFactorAuthQueries";
import { createTestUser } from "./testHelpers";

const rfcSecret = Buffer.from("12345678901234567890");

const getCurrentCode = async (userId: string, offsetSteps = 0) => {
  const twoFactorAuth = await fetchUserTwoFactorAuth(userId);
  const secret = decryptTotpSecret(twoFactorAuth!.encryptedSecret);
  return generateTotp(secret, getTotpTimeStep(Date.now()) + offsetSteps);
};

const createUserWithTwoFactorAuth = async () => {
  const user = await createTestUser({
    services: {
      resume: {
        loginTokens: [{ hashedToken: "current" }, { hashedToken: "other" }],
      },
    },
  });
  await beginTwoFactorAuthSetup(user);
  const { recoveryCodes } = await confirmTwoFactorAuthSetup(
    user,
    await getCurrentCode(user._id),
    "current",
  );
  // Move to the next time step so that tests can use a fresh code
  vi.setSystemTime(Date.now() + 30_000);
  return { user, recoveryCodes };
};

const fetchHashedLoginTokens = async (userId: string) => {
  const user = await db.query.users.findFirst({
    columns: { services: true },
    where: { _id: userId },
  });
  const services = user?.services as {
    resume: { loginTokens: { hashedToken: string }[] };
  };
  return services.resume.loginTokens.map(({ hashedToken }) => hashedToken);
};

suite("Two-factor auth", () => {
  beforeAll(() => {
    vi.stubEnv("TWO_FACTOR_SECRET_KEY", "test-two-factor-secret-key");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  suite("TOTP", () => {
    test("Matches the RFC 6238 SHA-1 test vectors", () => {
      const vectors: [number, string][] = [
        [59, "287082"],
        [1111111109, "081804"],
        [1111111111, "050471"],
        [1234567890, "005924"],
        [2000000000, "279037"],
        [20000000000, "353130"],
      ];
      for (const [seconds, code] of vectors) {
        expect(generateTotp(rfcSecret, getTotpTimeStep(seconds * 1000))).toBe(code);
      }
    });
    test("Allows one time step of clock drift in either direction", () => {
      const now = 1234567890000;
      const timeStep = getTotpTimeStep(now);
      for (const offset of [-1, 0, 1]) {
        const code = generateTotp(rfcSecret, timeStep + offset);
        expect(findTotpTimeStep(rfcSecret, code, now)).toBe(timeStep + offset);
      }
      for (const offset of [-2, 2]) {
        const code = generateTotp(rfcSecret, timeStep + offset);
        expect(findTotpTimeStep(rfcSecret, code, now)).toBeNull();
      }
    });
    test("Encodes secrets as unpadded base32", () => {
      expect(encodeBase32(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    });
  });

  suite("Pending login token", () => {
    test("Returns the user ID for a valid token", () => {
      const token = createPendingTwoFactorLoginToken("user-id");
      expect(verifyPendingTwoFactorLoginToken(token)).toBe("user-id");
    });
    test("Rejects a token for a different user", () => {
      const [, expiresAt, signature] =
        createPendingTwoFactorLoginToken("user-id").split(".");
      const forged = ["other-user-id", expiresAt, signature].join(".");
      expect(verifyPendingTwoFactorLoginToken(forged)).toBeNull();
    });
    test("Rejects an expired token", () => {
      const now = Date.now();
      const token = createPendingTwoFactorLoginToken("user-id", now);
      const expiry = now + PENDING_TWO_FACTOR_LOGIN_TTL_SECONDS * 1000;
      expect(verifyPendingTwoFactorLoginToken(token, expiry - 1)).toBe("user-id");
      expect(verifyPendingTwoFactorLoginToken(token, expiry)).toBeNull();
    });
  });

  suite("Setup", () => {
    test("Enabling revokes other login sessions", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user, recoveryCodes } = await createUserWithTwoFactorAuth();
      expect(recoveryCodes).toHaveLength(10);
      expect(await fetchHashedLoginTokens(user._id)).toStrictEqual(["current"]);
    });
    test("Can't restart setup once enabled", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user } = await createUserWithTwoFactorAuth();
      await expect(beginTwoFactorAuthSetup(user)).rejects.toThrow("already enabled");
    });
    test("Recovery codes can't be used to confirm setup", async () => {
      const user = await createTestUser();
      await beginTwoFactorAuthSetup(user);
      await expect(
        confirmTwoFactorAuthSetup(user, "abcde-fghij", null),
      ).rejects.toThrow("Invalid code");
    });
  });

  suite("Login", () => {
    test("Creates a login session with a valid code", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user } = await createUserWithTwoFactorAuth();
      const { hashedToken } = await completeTwoFactorLogin(
        createPendingTwoFactorLoginToken(user._id),
        await getCurrentCode(user._id),
      );
      expect(await fetchHashedLoginTokens(user._id)).toContain(hashedToken);
    });
    test("Rejects a missing or invalid pending login token", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user } = await createUserWithTwoFactorAuth();
      const code = await getCurrentCode(user._id);
      await expect(completeTwoFactorLogin(null, code)).rejects.toThrow("expired");
      await expect(completeTwoFactorLogin("invalid", code)).rejects.toThrow(
        "expired",
      );
    });
    test("Rejects a TOTP code that has already been used", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user } = await createUserWithTwoFactorAuth();
      const token = createPendingTwoFactorLoginToken(user._id);
      const code = await getCurrentCode(user._id);
      await completeTwoFactorLogin(token, code);
      await expect(completeTwoFactorLogin(token, code)).rejects.toThrow(
        "Invalid code",
      );
      const previousCode = await getCurrentCode(user._id, -1);
      await expect(completeTwoFactorLogin(token, previousCode)).rejects.toThrow(
        "Invalid code",
      );
    });
    test("Recovery codes can only be used once", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user, recoveryCodes } = await createUserWithTwoFactorAuth();
      const token = createPendingTwoFactorLoginToken(user._id);
      await completeTwoFactorLogin(token, recoveryCodes[0].toUpperCase());
      await expect(completeTwoFactorLogin(token, recoveryCodes[0])).rejects.toThrow(
        "Invalid code",
      );
      const twoFactorAuth = await fetchUserTwoFactorAuth(user._id);
      expect(twoFactorAuth?.recoveryCodeHashes).toHaveLength(9);
    });
    test("Locks out after too many incorrect codes", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user } = await createUserWithTwoFactorAuth();
      const token = createPendingTwoFactorLoginToken(user._id);
      for (let i = 0; i < 5; i++) {
        await expect(completeTwoFactorLogin(token, "000000")).rejects.toThrow(
          "Invalid code",
        );
      }
      const code = await getCurrentCode(user._id);
      await expect(completeTwoFactorLogin(token, code)).rejects.toThrow(
        "Too many incorrect codes",
      );
      vi.setSystemTime(Date.now() + 15 * 60 * 1000);
      await expect(
        completeTwoFactorLogin(
          createPendingTwoFactorLoginToken(user._id),
          await getCurrentCode(user._id),
        ),
      ).resolves.toBeTruthy();
    });
    test("Logging in is no longer possible after disabling", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const { user, recoveryCodes } = await createUserWithTwoFactorAuth();
      await disableTwoFactorAuth(user, recoveryCodes[0]);
      await expect(
        completeTwoFactorLogin(
          createPendingTwoFactorLoginToken(user._id),
          recoveryCodes[1],
        ),
      ).rejects.toThrow("expired");
    });
  });

  suite("sanitizeReturnTo", () => {
    test("Allows same-origin relative paths", () => {
      expect(sanitizeReturnTo("/posts/abc?x=1#y")).toBe("/posts/abc?x=1#y");
    });
    test("Rejects anything that could leave the site", () => {
      for (const returnTo of [
        "https://evil.com",
        "//evil.com",
        "/\\evil.com",
        "/\t/evil.com",
        "evil.com",
        null,
        42,
      ]) {
        expect(sanitizeReturnTo(returnTo)).toBe("/");
      }
    });
  });
});
