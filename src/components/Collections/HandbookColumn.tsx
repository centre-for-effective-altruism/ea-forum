import type { ReactNode } from "react";

export default function HandbookColumn({
  left,
  children,
}: Readonly<{
  left: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div
      data-component="HandbookColumn"
      className="
        grid grid-cols-[260px_minmax(0,900px)] gap-8 justify-center
        max-[1040px]:block w-full max-w-full relative
      "
    >
      <div className="max-[1040px]:hidden">{left}</div>
      <div className="w-full max-w-[900px] mx-auto">{children}</div>
    </div>
  );
}
