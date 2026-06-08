import z from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { userIsAdminOrMod } from "../users/userHelpers";

export const revisionsRouter = {
  runPangram: os
    .input(
      z.object({
        revisionId: z.string().nonempty(),
      }),
    )
    .handler(async () => {
      const currentUser = await getCurrentUser();
      if (!userIsAdminOrMod(currentUser)) {
        throw new Error("Permission denied");
      }
      // TODO
      return {
        status: "",
        aiScore: 1,
        rawResponse: {},
      };
    }),
};
