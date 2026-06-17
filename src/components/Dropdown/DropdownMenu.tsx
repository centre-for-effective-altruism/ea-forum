import { ReactNode, RefObject } from "react";
import type { Placement } from "@floating-ui/react";
import type { DropdownMenuItem } from "./DropdownItem";
import DropdownMenuItems from "./DropdownMenuItems";
import Dropdown from "./Dropdown";
import { AnalyticsContext } from "@/lib/analyticsEvents";

export default function DropdownMenu({
  placement,
  items,
  dismissRef,
  pageElementContext,
  className,
  children,
}: Readonly<{
  placement?: Placement;
  items: DropdownMenuItem[];
  dismissRef?: RefObject<(() => void) | null>;
  pageElementContext?: string;
  className?: string;
  children?: ReactNode;
}>) {
  return (
    <Dropdown
      placement={placement}
      dismissRef={dismissRef}
      menu={
        <AnalyticsContext pageElementContext={pageElementContext}>
          <DropdownMenuItems items={items} className={className} />
        </AnalyticsContext>
      }
    >
      {children}
    </Dropdown>
  );
}
