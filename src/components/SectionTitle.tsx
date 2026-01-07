import type { ReactNode } from "react";
import { slugify } from "@/lib/utils/slugify";
import Link from "next/link";
import clsx from "clsx";
import Type from "./Type";

export default function SectionTitle({
  title,
  noTopMargin,
  noBottomMargin,
  large,
  anchor,
  href,
  children,
  titleClassName,
  rootClassName,
}: Readonly<{
  title: ReactNode;
  noTopMargin?: boolean;
  noBottomMargin?: boolean;
  large?: boolean;
  anchor?: string;
  href?: string;
  children?: ReactNode;
  titleClassName?: string;
  rootClassName?: string;
}>) {
  const id = anchor
    ? anchor
    : typeof title === "string"
      ? slugify(title)
      : undefined;
  return (
    <div
      data-component="SectionTitle"
      className={clsx(
        "flex items-center justify-between",
        !noTopMargin && "mt-6",
        !noBottomMargin && "mt-2",
        rootClassName,
      )}
    >
      <Type
        id={id}
        style={large ? "sectionTitleLarge" : "sectionTitleSmall"}
        className={titleClassName}
      >
        {href ? <Link href={href}>{title}</Link> : title}
      </Type>
      {children && <div>{children}</div>}
    </div>
  );
}
