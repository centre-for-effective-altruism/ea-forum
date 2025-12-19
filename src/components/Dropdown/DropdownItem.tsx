import type { ComponentType } from "react";
import Type from "../Type";
import Link from "../Link";

export default function DropdownItem({
  title,
  Icon,
  href,
  onClick,
}: Readonly<{
  title: string;
  Icon?: ComponentType<{ className: string }>;
  href?: string;
  onClick?: () => void | Promise<void>;
}>) {
  return (
    <Link
      data-component="DropdownItem"
      href={href ?? "#"}
      onClick={onClick}
      className="rounded p-2 cursor-pointer hover:bg-gray-100 flex items-center gap-3"
    >
      {Icon && <Icon className="w-[20px] h-[20px] text-gray-600" />}
      <Type>{title}</Type>
    </Link>
  );
}
