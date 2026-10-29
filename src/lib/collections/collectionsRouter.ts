import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { userIsAdmin } from "../users/userHelpers";
import { fetchCollectionPosts } from "./collectionQueries";
import { collectionEditDataSchema } from "./collectionHelpers";
import { editCollection } from "./collectionMutations";

export const collectionsRouter = {
  listPosts: os
    .input(z.object({ collectionId: z.string().nonempty() }))
    .handler(async ({ input: { collectionId } }) => {
      const currentUser = await getCurrentUser();
      return await fetchCollectionPosts({ currentUser, collectionId });
    }),
  edit: os
    .input(
      z.object({
        collectionId: z.string().nonempty(),
        data: collectionEditDataSchema,
      }),
    )
    .handler(async ({ input: { collectionId, data } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      return await editCollection(currentUser, collectionId, data);
    }),
};
