"use client";

import { ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { isClient } from "@/lib/environment";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import ClickAwayListener from "react-click-away-listener";
import clsx from "clsx";

export default function Popover({
  open,
  onClose,
  background,
  className,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  background?: "dim" | "blurred";
  className?: string;
  children: ReactNode;
}>) {
  const [target] = useState<HTMLElement | null>(() =>
    isClient ? document.getElementById("modal-target") : null,
  );

  useBodyScrollLock(!!target && open);

  if (!target || !open) {
    return null;
  }

  return createPortal(
    <div
      data-component="Popover"
      className={clsx(
        "fixed left-0 top-0 w-full h-screen flex items-center justify-center",
        "z-1000 bg-(--color-modal-backdrop)",
        background === "blurred" && "backdrop-blur-xs",
        background === "dim" && "bg-[rgba(0,0,0,0.5)]",
      )}
    >
      <ClickAwayListener onClickAway={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          className={clsx(
            "max-h-[90vh] max-w-full overflow-auto bg-white p-8 rounded",
            "border-1 border-gray-200",
            className,
          )}
        >
          {children}
        </div>
      </ClickAwayListener>
    </div>,
    target,
  );
}
