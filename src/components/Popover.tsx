"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import {
  FloatingPortal,
  FloatingOverlay,
  FloatingFocusManager,
  useFloating,
  useDismiss,
  useRole,
  useInteractions,
  useFloatingNodeId,
} from "@floating-ui/react";

export default function Popover({
  open,
  onClose,
  background = "dim",
  className,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  background?: "dim" | "blurred";
  className?: string;
  children: ReactNode;
}>) {
  const nodeId = useFloatingNodeId();
  const { refs, context } = useFloating({
    nodeId,
    open,
    onOpenChange(open) {
      if (!open) {
        onClose();
      }
    },
  });
  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  });
  const role = useRole(context, { role: "dialog" });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!open) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        className={clsx(
          "fixed inset-0 flex items-center justify-center z-(--zindex-popover)",
          background === "blurred" && "backdrop-blur-xs",
          background === "dim" && "bg-popover-dim",
        )}
      >
        <FloatingFocusManager context={context} modal>
          <div
            // eslint-disable-next-line react-hooks/refs
            ref={refs.setFloating}
            {...getFloatingProps()}
            data-component="Popover"
            className={clsx("p-0 border-0 bg-transparent max-w-full max-h-screen")}
          >
            <div
              className={clsx(
                "max-h-[90vh] max-w-full overflow-auto bg-gray-0 p-8 rounded",
                "border-1 border-gray-200",
                className,
              )}
            >
              {children}
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
