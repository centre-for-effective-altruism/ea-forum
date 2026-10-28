import z from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { bookEditDataSchema } from "./bookHelpers";
import { editBook } from "./bookMutations";

export const booksRouter = {
  edit: os
    .input(
      z.object({
        bookId: z.string().nonempty(),
        data: bookEditDataSchema,
      }),
    )
    .handler(async ({ input: { bookId, data } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      return await editBook(currentUser, bookId, data);
    }),
};
