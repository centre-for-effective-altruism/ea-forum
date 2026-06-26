"use client";

import type { ElementType, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset,
  Placement,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import clsx from "clsx";

export default function ControlledTooltip({
  isOpen,
  setIsOpen,
  placement,
  className,
  tooltipClassName,
  title,
  interactable,
  popover,
  noHover,
  disabled,
  As = "div",
  children,
}: Readonly<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  placement?: Placement;
  className?: string;
  tooltipClassName?: string;
  title: ReactNode;
  interactable?: boolean;
  /**
   * The `popover` flag changes the default style to make this more of a styled
   * "popover" with important information, rather than a simple tooltip with
   * non-essential details
   */
  popover?: boolean;
  noHover?: boolean;
  disabled?: boolean;
  As?: ElementType;
  children: ReactNode;
}>) {
  const nodeId = useFloatingNodeId();
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating({
    nodeId,
    placement,
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, {
    enabled: !noHover,
    move: false,
    handleClose: interactable ? safePolygon() : undefined,
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context, { outsidePress: true });
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);
  return (
    <>
      <As
        ref={setReference}
        {...getReferenceProps()}
        className={className}
        data-component="ControlledTooltip"
      >
        {children}
      </As>
      {isOpen &&
        !disabled &&
        title &&
        createPortal(
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={clsx(
              "absolute rounded overflow-hidden max-w-full z-(--zindex-tooltip)",
              "px-2 py-1",
              popover
                ? "bg-surface-floating text-gray-900 shadow-lg border-1 border-gray-100"
                : "bg-tooltip-background text-tooltip-text",
              tooltipClassName,
            )}
            data-component="ControlledTooltip"
          >
            {title}
          </div>,
          document.getElementById("tooltip-target")!,
        )}
    </>
  );
}
