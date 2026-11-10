import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { addKeywordAlert, removeKeywordAlert } from "./keywordAlertMutations";

export const keywordAlertsRouter = {
  add: os
    .input(z.object({ keyword: z.string() }))
    .handler(async ({ input: { keyword } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return addKeywordAlert(currentUser, keyword);
    }),
  remove: os
    .input(z.object({ keyword: z.string() }))
    .handler(async ({ input: { keyword } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return removeKeywordAlert(currentUser, keyword);
    }),
};
