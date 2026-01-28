import { ReactNode, RefObject } from "react";
import type { Placement } from "@floating-ui/react";
import type { DropdownMenuItem } from "./DropdownItem";
import DropdownMenuItems from "./DropdownMenuItems";
import Dropdown from "./Dropdown";

export default function DropdownMenu({
  placement,
  items,
  dismissRef,
  className,
  children,
}: Readonly<{
  placement?: Placement;
  items: DropdownMenuItem[];
  dismissRef?: RefObject<(() => void) | null>;
  className?: string;
  children?: ReactNode;
}>) {
  return (
    <Dropdown
      placement={placement}
      dismissRef={dismissRef}
      menu={<DropdownMenuItems items={items} className={className} />}
    >
      {children}
    </Dropdown>
  );
}
