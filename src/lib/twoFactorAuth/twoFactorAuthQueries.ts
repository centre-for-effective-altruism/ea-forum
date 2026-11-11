import "server-only";
import { db } from "../db";

export const fetchUserTwoFactorAuth = (userId: string) =>
  db.query.userTwoFactorAuths.findFirst({
    where: { userId },
  });

export type UserTwoFactorAuth = NonNullable<
  Awaited<ReturnType<typeof fetchUserTwoFactorAuth>>
>;

export const userHasTwoFactorAuthEnabled = async (userId: string) => {
  const twoFactorAuth = await db.query.userTwoFactorAuths.findFirst({
    columns: { _id: true },
    where: {
      userId,
      enabledAt: { isNotNull: true },
    },
  });
  return !!twoFactorAuth;
};

export const fetchTwoFactorAuthStatus = async (userId: string) => {
  const twoFactorAuth = await fetchUserTwoFactorAuth(userId);
  const enabled = !!twoFactorAuth?.enabledAt;
  return {
    enabled,
    recoveryCodesRemaining: enabled ? twoFactorAuth.recoveryCodeHashes.length : 0,
  };
};
