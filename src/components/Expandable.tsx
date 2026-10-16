"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import TextLinkButton from "./TextLinkButton";

export default function Expandable({
  maxHeight,
  children,
}: Readonly<{
  maxHeight: number;
  children: ReactNode;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    const measure = () => setHeight(ref.current!.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const overflow = height > maxHeight;
  return (
    <div data-component="Expandable">
      <div
        className="
          relative overflow-hidden transition-[max-height] duration-300 ease-in-out
        "
        style={{
          maxHeight: expanded || !overflow ? height : maxHeight,
        }}
      >
        <div ref={ref}>{children}</div>
        {!expanded && overflow && (
          <div
            className="
              pointer-events-none absolute inset-x-0 bottom-0 h-16
              bg-gradient-to-b from-transparent to-surface-floating
            "
          />
        )}
      </div>
      {overflow && (
        <TextLinkButton className="mt-2" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </TextLinkButton>
      )}
    </div>
  );
}
