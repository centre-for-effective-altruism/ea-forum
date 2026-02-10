"use client";

import { ElementType, ReactNode, useState } from "react";
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

export default function Tooltip({
  placement,
  className,
  tooltipClassName,
  title,
  interactable,
  As = "div",
  children,
}: Readonly<{
  placement?: Placement;
  className?: string;
  tooltipClassName?: string;
  title: ReactNode;
  interactable?: boolean;
  As?: ElementType;
  children: ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);
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
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, {
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
        data-component="Tooltip"
      >
        {children}
      </As>
      {isOpen &&
        title &&
        createPortal(
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={clsx(
              "absolute bg-(--color-tooltip-background) text-gray-50 rounded",
              "z-(--zindex-tooltip) px-2 py-1 overflow-hidden",
              tooltipClassName,
            )}
            data-component="Tooltip"
          >
            {title}
          </div>,
          document.getElementById("tooltip-target")!,
        )}
    </>
  );
}
