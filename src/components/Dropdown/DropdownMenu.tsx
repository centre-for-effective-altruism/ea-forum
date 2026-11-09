"use client";

import { ReactNode, RefObject, useCallback, useRef } from "react";
import type { Placement } from "@floating-ui/react";
import { DropdownItemClickContext, type DropdownMenuItem } from "./DropdownItem";
import DropdownMenuItems from "./DropdownMenuItems";
import Dropdown from "./Dropdown";
import { AnalyticsContext } from "@/lib/analyticsEvents";

export default function DropdownMenu({
  placement,
  items,
  dismissRef: dismissRef_,
  closeOnItemClick,
  pageElementContext,
  className,
  children,
}: Readonly<{
  placement?: Placement;
  items: DropdownMenuItem[];
  dismissRef?: RefObject<(() => void) | null>;
  closeOnItemClick?: boolean;
  pageElementContext?: string;
  className?: string;
  children?: ReactNode;
}>) {
  const internalDismissRef = useRef<(() => void) | null>(null);
  const dismissRef = dismissRef_ ?? internalDismissRef;
  const dismiss = useCallback(() => dismissRef.current?.(), [dismissRef]);
  return (
    <Dropdown
      placement={placement}
      dismissRef={dismissRef}
      menu={
        <AnalyticsContext pageElementContext={pageElementContext}>
          <DropdownItemClickContext value={closeOnItemClick ? dismiss : null}>
            <DropdownMenuItems items={items} className={className} />
          </DropdownItemClickContext>
        </AnalyticsContext>
      }
    >
      {children}
    </Dropdown>
  );
}
