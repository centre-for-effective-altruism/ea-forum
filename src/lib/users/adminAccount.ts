import { cache } from "react";
import { db, DbOrTransaction } from "../db";
import { CurrentUser, currentUserProjection } from "./currentUser";

export const fetchAdminAccount = cache(
  async (txn: DbOrTransaction = db): Promise<CurrentUser> => {
    const adminEmail = process.env.ADMIN_ACCOUNT_EMAIL;
    if (!adminEmail) {
      throw new Error("Admin account email not configured");
    }
    const adminAccount = await txn.query.users.findFirst({
      ...currentUserProjection,
      where: {
        email: adminEmail,
      },
    });
    if (!adminAccount) {
      throw new Error("Admin account not found");
    }
    return adminAccount;
  },
);
