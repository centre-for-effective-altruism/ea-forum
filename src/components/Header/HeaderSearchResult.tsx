import type { ComponentType, ReactNode } from "react";
import Tooltip from "../Tooltip";
import Link from "../Link";
import Type from "../Type";

export default function HeaderSearchResult({
  tooltipTitle,
  href,
  Icon,
  children,
}: Readonly<{
  tooltipTitle: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}>) {
  return (
    <Type style="bodySmall" className="py-1 flex text-gray-600">
      <Tooltip title={tooltipTitle} placement="top">
        <Icon className="w-4 ml-1 mr-3 mt-1" />
      </Tooltip>
      <Link href={href} className="block grow hover:opacity-70">
        {children}
      </Link>
    </Type>
  );
}
