import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { chapterEditDataSchema } from "../sequences/sequenceHelpers";
import { createChapter, editChapter } from "./chapterMutations";

export const chaptersRouter = {
  create: os
    .input(
      z.object({
        sequenceId: z.string().nonempty(),
        data: chapterEditDataSchema,
      }),
    )
    .handler(async ({ input: { sequenceId, data } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      const chapterId = await createChapter(currentUser, sequenceId, data);
      return { chapterId };
    }),
  edit: os
    .input(
      z.object({
        chapterId: z.string().nonempty(),
        data: chapterEditDataSchema,
      }),
    )
    .handler(async ({ input: { chapterId, data } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await editChapter(currentUser, chapterId, data);
      return { chapterId };
    }),
};
