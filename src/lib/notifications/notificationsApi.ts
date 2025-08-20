import { ApiRoute } from "@/lib/apiRoute";
import z from "zod/v4";
import { notificationDisplaysSchema } from "./notificationsQueries.schemas";

export const getNotifications = new ApiRoute({
  endpoint: "/api/notifications",
  method: "GET",
  access: "logged-in",
  responseSchema: z.object({ notifications: notificationDisplaysSchema.array() }),
});
