import type { ReactNode } from "react";

export default function TagBody({
  html,
  children,
  className,
}: Readonly<{
  html?: string | null;
  children?: ReactNode;
  className?: string;
}>) {
  if (!html) {
    return null;
  }
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={className}
      data-component="TagBody"
    >
      {children}
    </div>
  );
}
