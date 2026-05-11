import { os } from "@orpc/server";
import { createLWEventSchema } from "./lwEventHelpers";
import { getCurrentUser } from "../users/currentUser";
import { createLWEvent } from "./lwEventMutations";

export const lwEventRouter = {
  create: os.input(createLWEventSchema).handler(async ({ input: data }) => {
    const currentUser = await getCurrentUser();
    await createLWEvent(currentUser, data);
  }),
};
