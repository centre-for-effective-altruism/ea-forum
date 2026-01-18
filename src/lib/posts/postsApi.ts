import z from "zod/v4";
import { ApiRoute } from "@/lib/apiRoute";
import { postsListViewSchema } from "./postsHelpers";

export const getPosts = new ApiRoute({
  endpoint: "/api/v1/posts",
  method: "GET",
  access: "all",
  searchParams: postsListViewSchema,
  responseSchema: z.object({ posts: z.any().array() }),
});
