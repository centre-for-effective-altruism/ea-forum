import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { spotlightInputSchema } from "./spotlightHelpers";
import { fetchAllSpotlightsForAdmin } from "./spotlightQueries";
import {
  createSpotlight,
  deleteSpotlight,
  updateSpotlight,
  uploadSpotlightImage,
} from "./spotlightMutations";

// ~10MB image, base64-encoded (4/3 overhead) with some headroom
const MAX_IMAGE_DATA_URI_LENGTH = 15_000_000;

export const spotlightsRouter = {
  listAll: os.handler(async () => {
    const currentUser = await getCurrentUser();
    return fetchAllSpotlightsForAdmin(currentUser);
  }),
  create: os.input(spotlightInputSchema).handler(async ({ input }) => {
    const currentUser = await getCurrentUser();
    return createSpotlight(currentUser, input);
  }),
  update: os
    .input(z.object({ _id: z.string().nonempty(), data: spotlightInputSchema }))
    .handler(async ({ input: { _id, data } }) => {
      const currentUser = await getCurrentUser();
      await updateSpotlight(currentUser, _id, data);
    }),
  delete: os
    .input(z.object({ _id: z.string().nonempty() }))
    .handler(async ({ input: { _id } }) => {
      const currentUser = await getCurrentUser();
      await deleteSpotlight(currentUser, _id);
    }),
  uploadImage: os
    .input(
      z.object({
        dataUri: z.string().startsWith("data:image/").max(MAX_IMAGE_DATA_URI_LENGTH),
      }),
    )
    .handler(async ({ input: { dataUri } }) => {
      const currentUser = await getCurrentUser();
      return uploadSpotlightImage(currentUser, dataUri);
    }),
};
