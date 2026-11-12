"use client";

import { ReactNode, useEffect, useRef } from "react";
import clsx from "clsx";
import { useFormGroupExpanded } from "../Forms/CollapsibleFormGroup";

export default function HighlightableSetting({
  highlighted,
  children,
}: Readonly<{
  highlighted: boolean;
  children: ReactNode;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const groupExpanded = useFormGroupExpanded();
  useEffect(() => {
    if (highlighted && groupExpanded) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted, groupExpanded]);
  return (
    <div
      ref={ref}
      className={clsx("rounded -mx-2 px-2", highlighted && "animate-highlight-fade")}
    >
      {children}
    </div>
  );
}
