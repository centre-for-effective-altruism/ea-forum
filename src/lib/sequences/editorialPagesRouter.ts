import { z } from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { editorialPageSchema } from "./editorialPages";
import { deleteEditorialPage, saveEditorialPage } from "./editorialPageMutations";

const assertAdmin = async () => {
  const currentUser = await getCurrentUser();
  if (!userIsAdmin(currentUser)) {
    throw new Error("Permission denied");
  }
};

export const editorialPagesRouter = {
  save: os
    .input(
      z.object({
        page: editorialPageSchema,
        previousSlug: editorialPageSchema.shape.slug.optional(),
      }),
    )
    .handler(async ({ input: { page, previousSlug } }) => {
      await assertAdmin();
      return await saveEditorialPage({ page, previousSlug });
    }),
  delete: os
    .input(z.object({ slug: editorialPageSchema.shape.slug }))
    .handler(async ({ input: { slug } }) => {
      await assertAdmin();
      return await deleteEditorialPage(slug);
    }),
};
