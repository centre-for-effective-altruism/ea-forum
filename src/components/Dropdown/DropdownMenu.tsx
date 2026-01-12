import { ComponentProps, ReactNode, RefObject } from "react";
import type { Placement } from "@floating-ui/react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";

export default function DropdownMenu({
  placement,
  items,
  onClickItem,
  dismissRef,
  className,
  children,
}: Readonly<{
  placement?: Placement;
  items: (ComponentProps<typeof DropdownItem> | "divider")[];
  onClickItem?: (title: string) => void;
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
          className={`bg-white rounded shadow p-2 border border-gray-100 ${className}`}
        >
          {items.map((item, i) =>
            item === "divider" ? (
              <hr key={i} className="border-t border-solid border-gray-300 my-2" />
            ) : (
              <DropdownItem
                key={item.title}
                {...item}
                onClick={onClickItem?.bind(null, item.title)}
              />
            ),
          )}
        </div>
      }
    >
      {children}
    </Dropdown>
  );
}
