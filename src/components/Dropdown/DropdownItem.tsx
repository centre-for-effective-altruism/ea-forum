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
  const Wrapper = href ? Link : "button";
  return (
    <Wrapper
      href={href!}
      onClick={onClick}
      className="
        rounded p-2 cursor-pointer hover:bg-gray-100 outline-none w-full
        flex items-center justify-start gap-3 text-left
      "
    >
      {Icon && <Icon className="w-[20px] h-[20px] text-gray-600" />}
      <Type className="grow">{title}</Type>
      {checked && <CheckIcon className="w-4 text-primary" />}
    </Wrapper>
  );
}
