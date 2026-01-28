import { filterNonNull } from "@/lib/typeHelpers";
import DropdownItem, { DropdownMenuItem } from "./DropdownItem";
import clsx from "clsx";

export default function DropdownMenuItems({
  items,
  className,
}: Readonly<{
  items: DropdownMenuItem[];
  className?: string;
}>) {
  return (
    <div
      data-component="DropdownMenuItems"
      className={clsx(
        "bg-gray-0 rounded shadow p-2 border border-gray-100 min-w-[200px]",
        className,
      )}
    >
      {filterNonNull(items).map((item, i) =>
        item === "divider" ? (
          <hr key={i} className="border-t border-solid border-gray-300 my-2" />
        ) : (
          <DropdownItem key={item.title} {...item} />
        ),
      )}
    </div>
  );
}
