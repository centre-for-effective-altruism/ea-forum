import * as Sentry from "@sentry/nextjs";
import { registerOTel, OTLPHttpJsonTraceExporter } from "@vercel/otel";

const initOpenTelemetry = () => {
  if (
    !process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  ) {
    return;
  }
  registerOTel({
    serviceName: `eaforum-${process.env.NEXT_PUBLIC_ENVIRONMENT}`,
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/i/v1/traces`,
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN}`,
      },
    }),
  });
};

export const register = async () => {
  initOpenTelemetry();
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
};

export const onRequestError = Sentry.captureRequestError;
