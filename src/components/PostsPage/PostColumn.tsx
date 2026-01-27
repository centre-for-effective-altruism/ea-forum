import { ReactNode } from "react";

export default function PostColumn({
  left,
  right,
  children,
}: Readonly<{
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div
      data-component="PostColumn"
      className="
        grid grid-cols-[1fr_min-content_1fr] gap-8 justify-between
        max-[1040px]:block w-full max-w-full relative
      "
    >
      <div className="w-[260px] max-[1040px]:hidden">{left}</div>
      <div className="w-[698px] max-w-full mx-auto">{children}</div>
      <div className="w-[260px] max-[1320px]:hidden">{right}</div>
    </div>
  );
}
