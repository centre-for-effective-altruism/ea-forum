import { ReactNode, RefObject } from "react";
import type { Placement } from "@floating-ui/react";
import { filterNonNull } from "@/lib/typeHelpers";
import DropdownItem, { DropdownItemProps } from "./DropdownItem";
import Dropdown from "./Dropdown";

export default function DropdownMenu({
  placement,
  items,
  dismissRef,
  className,
  children,
}: Readonly<{
  placement?: Placement;
  items: (DropdownItemProps | "divider" | null)[];
  dismissRef?: RefObject<(() => void) | null>;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <Dropdown
      placement={placement}
      dismissRef={dismissRef}
      menu={
        <div
          data-component="DropdownMenu"
          className={`bg-gray-0 rounded shadow p-2 border border-gray-100 ${className}`}
        >
          {filterNonNull(items).map((item, i) =>
            item === "divider" ? (
              <hr key={i} className="border-t border-solid border-gray-300 my-2" />
            ) : (
              <DropdownItem key={item.title} {...item} />
            ),
          )}
        </div>
      }
    >
      {children}
    </Dropdown>
  );
}
