import type { Json } from "@/lib/typeHelpers";

/**
 * This component should always be rendered directly in the relevant page.tsx
 * file - we want it to always be SSR'd. It doesn't matter where in the page
 * it is located.
 */
export default function StructuredData({ data }: Readonly<{ data: Json }>) {
  return (
    <script
      data-component="StructuredData"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
