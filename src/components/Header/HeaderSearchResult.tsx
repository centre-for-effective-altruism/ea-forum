import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";
import Link from "../Link";
import Type from "../Type";

export default function HeaderSearchResult({
  href,
  Icon,
  leading,
  selected,
  children,
}: Readonly<{
  href: string;
  Icon?: ComponentType<{ className?: string }>;
  leading?: ReactNode;
  selected?: boolean;
  children: ReactNode;
}>) {
  return (
    <Type
      style="bodySmall"
      className={clsx(
        "py-1 px-2 rounded flex text-gray-600",
        "hover:bg-surface-floating-hover hover:text-gray-800",
        selected && "bg-surface-floating-hover text-gray-800",
      )}
    >
      {leading ??
        (Icon ? (
          <Icon className="w-5 shrink-0 self-start ml-1 mr-3 mt-0.5" />
        ) : null)}
      <Link href={href} className="block grow min-w-0 break-words">
        {children}
      </Link>
    </Type>
  );
}
