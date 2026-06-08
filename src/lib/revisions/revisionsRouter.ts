import z from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { userIsAdminOrMod } from "../users/userHelpers";
import { runPangramOnRevision } from "./pangramMutations";

export const revisionsRouter = {
  runPangram: os
    .input(
      z.object({
        revisionId: z.string().nonempty(),
      }),
    )
    .handler(async ({ input: { revisionId } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdminOrMod(currentUser)) {
        throw new Error("Only admins and moderators can run Pangram");
      }
      return await runPangramOnRevision(revisionId);
    }),
};
