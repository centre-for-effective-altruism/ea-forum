"use client";

import type { ReactNode } from "react";
import { IntercomProvider } from "react-use-intercom";

export default function IntercomClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <IntercomProvider
      appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID}
      // The means that intercom won't be installed until later, after
      // we check if suitable cookies are enabled
      autoBoot={false}
    >
      {children}
    </IntercomProvider>
  );
}
