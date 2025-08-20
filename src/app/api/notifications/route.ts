import { loggedInOnlyRequestHandler } from "@/lib/requestHandler";
import { getSocialImagePreviewPrefix } from "@/lib/cloudinaryHelpers";
import { NotificationsRepo } from "@/lib/notifications/notificationsQueries.repo";

export const GET = loggedInOnlyRequestHandler(async ({ db, currentUser }) => {
  const notifications = await new NotificationsRepo(db).notificationDisplays({
    userId: currentUser._id,
    limit: 20, // TODO
    offset: 0, // TODO
    postSocialPreviewPrefix: getSocialImagePreviewPrefix(),
  });
  return Response.json({ notifications }, { status: 200 });
});
