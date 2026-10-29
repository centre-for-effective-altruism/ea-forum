import { cache } from "react";
import { PostHog } from "posthog-node";
import { isAnyTest } from "./environment";
import { getCurrentUser } from "./users/currentUser";
import { getCurrentClientId } from "./clientIds/currentClientId";
import { posthogSuperProperties } from "./analytics/posthogSuperProperties";

let posthogClient: PostHog | null = null;

export const getPostHogClient = (): PostHog | null => {
  if (!posthogClient && !isAnyTest()) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
};

export const shutdownPostHog = async () => {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
};

/**
 * Logged-in users match the ID used by `posthog.identify` in `useCurrentUser`.
 * Logged-out users fall back to their client ID, which client-side events also
 * carry as the `clientId` property.
 */
export const getPostHogDistinctId = cache(async () => {
  const user = await getCurrentUser();
  if (user) {
    return user._id;
  }
  return await getCurrentClientId();
});

export const captureServerException = async (
  error: unknown,
  properties?: Record<string, unknown>,
) => {
  await getPostHogClient()?.captureExceptionImmediate(error, undefined, {
    ...posthogSuperProperties,
    ...properties,
  });
};
