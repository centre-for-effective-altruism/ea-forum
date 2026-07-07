import z from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { spotlightEditDataSchema } from "./spotlightHelpers";
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
    return await createSpotlight();
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
      return await editSpotlight(currentUser, spotlightId, data);
    }),
  delete: os
    .input(z.object({ spotlightId: z.string().nonempty() }))
    .handler(async ({ input: { spotlightId } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      return await deleteSpotlight(spotlightId);
    }),
};
