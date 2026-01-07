import z from "zod/v4";
import { ApiRoute } from "@/lib/apiRoute";
import { notificationDisplaySchema } from "./notificationDisplayTypes";

export const getNotifications = new ApiRoute({
  endpoint: "/api/notifications",
  method: "GET",
  access: "logged-in",
  responseSchema: z.object({ notifications: notificationDisplaySchema.array() }),
});
