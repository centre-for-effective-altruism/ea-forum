// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { posthogSuperProperties } from "./lib/analytics/posthogSuperProperties";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Define how likely traces are sampled. Adjust this value in production, or use
  // tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,
  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-05-30",
    capture_exceptions: true,
    persistence: "localStorage+cookie",
    // Capture cookielessly until `PostHogConsent` opts the user in based on
    // their cookie preferences
    cookieless_mode: "on_reject",
    opt_out_capturing_by_default: true,
    loaded: (ph) => {
      ph.register(posthogSuperProperties);
    },
    // Set this to true to enable verbose posthog logs in the console
    debug: false,
  });
} else {
  console.warn("Warning: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is not set");
}
