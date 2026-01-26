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
      className="w-full relative grid grid-cols-[1fr_min-content_1fr]"
    >
      <div>{left}</div>
      <div className="w-[698px] max-w-full mx-auto">{children}</div>
      <div>{right}</div>
    </div>
  );
}
