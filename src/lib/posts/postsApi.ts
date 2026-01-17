import z from "zod/v4";
import { ApiRoute } from "@/lib/apiRoute";

export const getPosts = new ApiRoute({
  endpoint: "/api/v1/posts",
  method: "GET",
  access: "all",
  responseSchema: z.object({ posts: z.any().array() }),
});
