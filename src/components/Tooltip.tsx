"use client";

import { ElementType, ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset,
  Placement,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";

export default function Tooltip({
  placement,
  className = "",
  tooltipClassName = "",
  title,
  As = "div",
  children,
}: Readonly<{
  placement?: Placement;
  className?: string;
  tooltipClassName?: string;
  title: ReactNode;
  As?: ElementType;
  children: ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
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
            className={`
              absolute bg-(--color-tooltip-background) text-gray-50 rounded
              z-1000 px-2 py-1 overflow-hidden ${tooltipClassName}
            `}
            data-component="Tooltip"
          >
            {title}
          </div>,
          document.getElementById("tooltip-target")!,
        )}
    </>
  );
}
