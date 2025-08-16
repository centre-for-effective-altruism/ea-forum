import { useCallback, ComponentType, MouseEvent } from "react";
import Type from "../Type";
import Link from "../Link";

export default function DropdownItem({
  title,
  Icon,
  href,
}: Readonly<{
  title: string;
  Icon?: ComponentType<{ className: string }>;
  href?: string;
}>) {
  const onClick = useCallback(
    (ev: MouseEvent<HTMLAnchorElement>) => {
      if (!href) {
        ev.preventDefault();
        // TODO: Custom actions
      }
    },
    [href],
  );
  return (
    <Link
      href={href ?? "#"}
      onClick={onClick}
      className="rounded p-2 cursor-pointer hover:bg-gray-100 flex items-center gap-3"
      data-component="DropdownItem"
    >
      {Icon && <Icon className="w-[20px] h-[20px] text-gray-600" />}
      <Type>{title}</Type>
    </Link>
  );
}
