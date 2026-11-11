import "server-only";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../db";
import { users, userTwoFactorAuths } from "../schema";
import { randomId } from "../utils/random";
import { createLoginSession } from "../authHelpers";
import type { CurrentUser } from "../users/currentUser";
import { fetchUserTwoFactorAuth, UserTwoFactorAuth } from "./twoFactorAuthQueries";
import {
  decryptTotpSecret,
  encodeBase32,
  encryptTotpSecret,
  findTotpTimeStep,
  generateRecoveryCodes,
  generateTotpSecret,
  getTotpUri,
  hashRecoveryCode,
  parseTwoFactorCode,
  verifyPendingTwoFactorLoginToken,
} from "./twoFactorAuthHelpers";

const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;

const isLockedOut = (twoFactorAuth: UserTwoFactorAuth) =>
  twoFactorAuth.failedAttempts >= MAX_FAILED_ATTEMPTS &&
  !!twoFactorAuth.lastFailedAttemptAt &&
  Date.now() - new Date(twoFactorAuth.lastFailedAttemptAt).getTime() <
    FAILED_ATTEMPTS_WINDOW_MS;

const resetFailedAttempts = { failedAttempts: 0, lastFailedAttemptAt: null };

const recordFailedAttempt = async (twoFactorAuthId: string) => {
  const windowStart = new Date(Date.now() - FAILED_ATTEMPTS_WINDOW_MS).toISOString();
  await db
    .update(userTwoFactorAuths)
    .set({
      failedAttempts: sql`
        CASE WHEN ${userTwoFactorAuths.lastFailedAttemptAt} < ${windowStart}
          THEN 1
          ELSE ${userTwoFactorAuths.failedAttempts} + 1
        END
      `,
      lastFailedAttemptAt: new Date().toISOString(),
    })
    .where(eq(userTwoFactorAuths._id, twoFactorAuthId));
};

// Each code can only be used once, so the time step must be strictly
// greater than the last one that was used
const consumeTotp = async (twoFactorAuth: UserTwoFactorAuth, code: string) => {
  const secret = decryptTotpSecret(twoFactorAuth.encryptedSecret);
  const timeStep = findTotpTimeStep(secret, code, Date.now());
  if (timeStep === null) {
    return false;
  }
  const updated = await db
    .update(userTwoFactorAuths)
    .set({ lastUsedTimeStep: timeStep, ...resetFailedAttempts })
    .where(
      and(
        eq(userTwoFactorAuths._id, twoFactorAuth._id),
        or(
          isNull(userTwoFactorAuths.lastUsedTimeStep),
          lt(userTwoFactorAuths.lastUsedTimeStep, timeStep),
        ),
      ),
    )
    .returning();
  return updated.length > 0;
};

const consumeRecoveryCode = async (
  twoFactorAuth: UserTwoFactorAuth,
  code: string,
) => {
  const hashedCode = hashRecoveryCode(code);
  const updated = await db
    .update(userTwoFactorAuths)
    .set({
      ...resetFailedAttempts,
      recoveryCodeHashes: sql`
        ARRAY_REMOVE(${userTwoFactorAuths.recoveryCodeHashes}, ${hashedCode})
      `,
    })
    .where(
      and(
        eq(userTwoFactorAuths._id, twoFactorAuth._id),
        sql`${hashedCode} = ANY(${userTwoFactorAuths.recoveryCodeHashes})`,
      ),
    )
    .returning();
  return updated.length > 0;
};

const verifyTwoFactorCode = async (
  twoFactorAuth: UserTwoFactorAuth,
  input: string,
  { allowRecoveryCode }: { allowRecoveryCode: boolean },
) => {
  if (isLockedOut(twoFactorAuth)) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Too many incorrect codes - please try again later",
    });
  }
  const { type, code } = parseTwoFactorCode(input);
  const isValid =
    type === "totp"
      ? await consumeTotp(twoFactorAuth, code)
      : allowRecoveryCode && (await consumeRecoveryCode(twoFactorAuth, code));
  if (!isValid) {
    await recordFailedAttempt(twoFactorAuth._id);
    throw new ORPCError("BAD_REQUEST", { message: "Invalid code" });
  }
};

const fetchEnabledTwoFactorAuth = async (userId: string) => {
  const twoFactorAuth = await fetchUserTwoFactorAuth(userId);
  if (!twoFactorAuth?.enabledAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Two-factor authentication is not enabled",
    });
  }
  return twoFactorAuth;
};

export const beginTwoFactorAuthSetup = async (user: CurrentUser) => {
  const secret = generateTotpSecret();
  const encryptedSecret = encryptTotpSecret(secret);
  const [twoFactorAuth] = await db
    .insert(userTwoFactorAuths)
    .values([{ _id: randomId(), userId: user._id, encryptedSecret }])
    .onConflictDoUpdate({
      target: userTwoFactorAuths.userId,
      set: {
        encryptedSecret,
        lastUsedTimeStep: null,
        recoveryCodeHashes: [],
        failedAttempts: 0,
        lastFailedAttemptAt: null,
      },
      setWhere: isNull(userTwoFactorAuths.enabledAt),
    })
    .returning();
  if (!twoFactorAuth) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Two-factor authentication is already enabled",
    });
  }
  const uri = getTotpUri(secret, user.email || user.displayName || user._id);
  return {
    secret: encodeBase32(secret),
    qrCodeDataUrl: await QRCode.toDataURL(uri),
  };
};

const revokeOtherLoginSessions = async (
  userId: string,
  currentHashedLoginToken: string | null,
) => {
  await db
    .update(users)
    .set({
      services: sql`
        JSONB_SET(
          ${users.services},
          '{resume,loginTokens}',
          COALESCE(
            (
              SELECT JSONB_AGG(token)
              FROM JSONB_ARRAY_ELEMENTS(
                ${users.services}->'resume'->'loginTokens'
              ) AS token
              WHERE token->>'hashedToken' = ${currentHashedLoginToken}
            ),
            '[]'::JSONB
          )
        )
      `,
    })
    .where(
      and(
        eq(users._id, userId),
        sql`JSONB_TYPEOF(${users.services}->'resume'->'loginTokens') = 'array'`,
      ),
    );
};

export const confirmTwoFactorAuthSetup = async (
  user: CurrentUser,
  code: string,
  currentHashedLoginToken: string | null,
) => {
  const twoFactorAuth = await fetchUserTwoFactorAuth(user._id);
  if (!twoFactorAuth) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Two-factor authentication setup has not been started",
    });
  }
  if (twoFactorAuth.enabledAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Two-factor authentication is already enabled",
    });
  }
  await verifyTwoFactorCode(twoFactorAuth, code, { allowRecoveryCode: false });
  const recoveryCodes = generateRecoveryCodes();
  await db
    .update(userTwoFactorAuths)
    .set({
      enabledAt: new Date().toISOString(),
      recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
    })
    .where(eq(userTwoFactorAuths._id, twoFactorAuth._id));
  await revokeOtherLoginSessions(user._id, currentHashedLoginToken);
  return { recoveryCodes };
};

export const disableTwoFactorAuth = async (user: CurrentUser, code: string) => {
  const twoFactorAuth = await fetchEnabledTwoFactorAuth(user._id);
  await verifyTwoFactorCode(twoFactorAuth, code, { allowRecoveryCode: true });
  await db
    .delete(userTwoFactorAuths)
    .where(eq(userTwoFactorAuths._id, twoFactorAuth._id));
};

export const regenerateRecoveryCodes = async (user: CurrentUser, code: string) => {
  const twoFactorAuth = await fetchEnabledTwoFactorAuth(user._id);
  await verifyTwoFactorCode(twoFactorAuth, code, { allowRecoveryCode: true });
  const recoveryCodes = generateRecoveryCodes();
  await db
    .update(userTwoFactorAuths)
    .set({ recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode) })
    .where(eq(userTwoFactorAuths._id, twoFactorAuth._id));
  return { recoveryCodes };
};

export const completeTwoFactorLogin = async (
  pendingLoginToken: string | null,
  code: string,
) => {
  const userId = pendingLoginToken
    ? verifyPendingTwoFactorLoginToken(pendingLoginToken)
    : null;
  const twoFactorAuth = userId ? await fetchUserTwoFactorAuth(userId) : null;
  if (!userId || !twoFactorAuth?.enabledAt) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Your login has expired - please log in again",
    });
  }
  await verifyTwoFactorCode(twoFactorAuth, code, { allowRecoveryCode: true });
  return await createLoginSession(userId);
};
