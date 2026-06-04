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
              "absolute bg-tooltip-background text-tooltip-text rounded",
              "z-(--zindex-tooltip) px-2 py-1 overflow-hidden max-w-full",
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
