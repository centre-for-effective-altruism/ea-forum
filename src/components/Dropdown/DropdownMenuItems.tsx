import type { FC } from "react";
import DropdownItem, { DropdownMenuItem } from "./DropdownItem";
import clsx from "clsx";

const Item: FC<{ item: DropdownMenuItem }> = ({ item }) => {
  if (item === "divider") {
    return <hr className="border-t border-solid border-gray-300 my-2" />;
  }
  if (item && typeof item === "object" && "title" in item) {
    return <DropdownItem {...item} />;
  }
  // If we get here then `item` is a ReactNode
  return item;
};

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
      {items.map((item, i) => (
        <Item item={item} key={i} />
      ))}
    </div>
  );
}
