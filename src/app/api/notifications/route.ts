import { loggedInOnlyRequestHandler } from "@/lib/requestHandler";
import { fetchNotificationDisplays } from "@/lib/notifications/fetchNotificationDisplays";

export const GET = loggedInOnlyRequestHandler(async ({ currentUser }) => {
  const notifications = await fetchNotificationDisplays({
    userId: currentUser._id,
    limit: 20, // TODO pagination
    offset: 0, // TODO
  });
  return Response.json({ notifications }, { status: 200 });
});
