import { PostHog } from "posthog-node";
import { isAnyTest } from "./environment";

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
