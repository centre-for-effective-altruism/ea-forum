import type { ComponentType } from "react";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import Type from "../Type";
import Link from "../Link";

export default function DropdownItem({
  title,
  Icon,
  href,
  checked,
  onClick,
}: Readonly<{
  title: string;
  Icon?: ComponentType<{ className: string }>;
  href?: string;
  checked?: boolean;
  onClick?: () => void | Promise<void>;
}>) {
  return (
    <Link
      data-component="DropdownItem"
      href={href ?? "#"}
      onClick={onClick}
      className="
        rounded p-2 cursor-pointer hover:bg-gray-100 flex items-center gap-3
        outline-none
      "
    >
      {Icon && <Icon className="w-[20px] h-[20px] text-gray-600" />}
      <Type className="grow">{title}</Type>
      {checked && <CheckIcon className="w-4 text-primary" />}
    </Link>
  );
}
