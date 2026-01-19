import z from "zod/v4";
import { ApiRoute } from "@/lib/apiRoute";
import { notificationDisplaySchema } from "./notificationDisplayTypes";
import { postsListViewSchema } from "../posts/postsHelpers";

export const getNotifications = new ApiRoute({
  endpoint: "/api/notifications-v2",
  method: "GET",
  access: "logged-in",
  searchParams: postsListViewSchema,
  responseSchema: z.object({ notifications: notificationDisplaySchema.array() }),
});
