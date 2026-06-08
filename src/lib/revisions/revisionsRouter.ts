import z from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
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
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await runPangramOnRevision(currentUser, revisionId);
    }),
};
