import { ReactNode } from "react";
import Type from "../Type";
import clsx from "clsx";

export default function UserProfileHeading({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <Type
      style="sectionTitleLarge"
      className={clsx("inline-block border-b-3 border-primary pb-[3px]", className)}
    >
      {children}
    </Type>
  );
}
