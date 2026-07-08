import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { fetchCollectionPosts } from "./collectionQueries";

export const collectionsRouter = {
  listPosts: os
    .input(z.object({ collectionId: z.string().nonempty() }))
    .handler(async ({ input: { collectionId } }) => {
      const currentUser = await getCurrentUser();
      return await fetchCollectionPosts({ currentUser, collectionId });
    }),
};
