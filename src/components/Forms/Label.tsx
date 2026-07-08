import type { ReactNode } from "react";

export default function Label({
  htmlFor,
  children,
  className,
}: Readonly<{
  htmlFor: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div data-component="Label" className={className}>
      <label
        htmlFor={htmlFor}
        className="inline-block text-[12px] font-[400] text-primary"
      >
        {children}
      </label>
    </div>
  );
}
