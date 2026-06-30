import * as Sentry from "@sentry/nextjs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/v1/traces`,
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN}`,
    },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: `eaforum-${process.env.NEXT_PUBLIC_ENVIRONMENT}`,
  }),
});

export const register = async () => {
  if (
    process.env.NEXT_PUBLIC_POSTHOG_HOST &&
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  ) {
    sdk.start();
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
};

export const onRequestError = Sentry.captureRequestError;
