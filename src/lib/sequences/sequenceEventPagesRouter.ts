import { z } from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { sequenceEventPageSchema } from "./sequenceEvents";
import {
  deleteSequenceEventPage,
  saveSequenceEventPage,
} from "./sequenceEventPageMutations";

const assertAdmin = async () => {
  const currentUser = await getCurrentUser();
  if (!userIsAdmin(currentUser)) {
    throw new Error("Permission denied");
  }
};

export const sequenceEventPagesRouter = {
  save: os
    .input(
      z.object({
        page: sequenceEventPageSchema,
        previousSlug: sequenceEventPageSchema.shape.slug.optional(),
      }),
    )
    .handler(async ({ input: { page, previousSlug } }) => {
      await assertAdmin();
      return await saveSequenceEventPage({ page, previousSlug });
    }),
  delete: os
    .input(z.object({ slug: sequenceEventPageSchema.shape.slug }))
    .handler(async ({ input: { slug } }) => {
      await assertAdmin();
      return await deleteSequenceEventPage(slug);
    }),
};
