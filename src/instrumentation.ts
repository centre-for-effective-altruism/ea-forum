import * as Sentry from "@sentry/nextjs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const initOpenTelemetry = () => {
  if (
    !process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  ) {
    return;
  }
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/i/v1/traces`,
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN}`,
      },
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Both OpenTelemetry and Sentry try to patch undici with traceparent
        // headers. Having two of these headers causes Elasticsearch to crash...
        "@opentelemetry/instrumentation-undici": {
          enabled: false,
        },
      }),
    ],
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: `eaforum-${process.env.NEXT_PUBLIC_ENVIRONMENT}`,
    }),
  });
  sdk.start();
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
