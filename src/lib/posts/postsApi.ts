import z from "zod/v4";
import { ApiRoute } from "@/lib/apiRoute";
import { postByIdSchema } from "./postQueries.schemas";

export const getPostById = new ApiRoute({
  endpoint: "/api/posts/[_id]",
  method: "GET",
  access: "all",
  responseSchema: z.object({ post: postByIdSchema.nullable() }),
});
