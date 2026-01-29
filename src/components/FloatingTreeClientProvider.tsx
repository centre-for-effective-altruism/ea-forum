"use client";

import type { ReactNode } from "react";
import { FloatingTree } from "@floating-ui/react";

export default function FloatingTreeClientProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <FloatingTree>{children}</FloatingTree>;
}
