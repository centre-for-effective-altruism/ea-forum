import z from "zod/v4";
import { os } from "@orpc/server";
import { revalidateTag } from "next/cache";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { spotlightEditDataSchema } from "./spotlightHelpers";
import { currentSpotlightCacheTag } from "./spotlightQueries";
import {
  createSpotlight,
  deleteSpotlight,
  editSpotlight,
} from "./spotlightMutations";

export const spotlightsRouter = {
  create: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!userIsAdmin(currentUser)) {
      throw new Error("Permission denied");
    }
    const result = await createSpotlight();
    revalidateTag(currentSpotlightCacheTag, { expire: 0 });
    return result;
  }),
  edit: os
    .input(
      z.object({
        spotlightId: z.string().nonempty(),
        data: spotlightEditDataSchema,
      }),
    )
    .handler(async ({ input: { spotlightId, data } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      const result = await editSpotlight(currentUser, spotlightId, data);
      revalidateTag(currentSpotlightCacheTag, { expire: 0 });
      return result;
    }),
  delete: os
    .input(z.object({ spotlightId: z.string().nonempty() }))
    .handler(async ({ input: { spotlightId } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      const result = await deleteSpotlight(spotlightId);
      revalidateTag(currentSpotlightCacheTag, { expire: 0 });
      return result;
    }),
};
