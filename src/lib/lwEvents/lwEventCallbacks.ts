import type { CurrentUser } from "../users/currentUser";
import type { LWEvent } from "../schema";
import { captureException } from "@sentry/nextjs";
import { getIntercomClient } from "../intercom";

export const sendIntercomEvent = async (
  user: CurrentUser | null,
  event: LWEvent,
) => {
  try {
    const intercomClient = getIntercomClient();
    if (!intercomClient) {
      return;
    }
    if (!user || !event?.intercom) {
      return;
    }
    // Append documentId to metadata passed to intercom
    event.properties = {
      ...event.properties,
      documentId: event.documentId,
    };
    await intercomClient.events.create({
      event_name: event.name ?? "",
      created_at: Math.floor(new Date().getTime() / 1000),
      user_id: user._id,
      metadata: event.properties as Record<string, string>,
    });
  } catch (e) {
    // `intercomClient.events.create` involves a request to Intercom's servers,
    // which can fail. We had an issue where the request to Intercom's server
    // would fail with a 401 (unauthorized), the exception would bubble out of
    // this callback, and an LW user's request to `/graphql`, containing a
    // page-view event and also some requests for data, would return that 401.
    // This would cause the user to see a spurious login prompt, and also the
    // request itself would fail.
    captureException(e);
  }
};
