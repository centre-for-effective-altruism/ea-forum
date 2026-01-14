"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { isClient } from "@/lib/environment";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // Handle native dialog close events (like ESC key)
    const handleClose = () => onClose();

    // Handle click on the ::backdrop pseudo-element
    const handleClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!isInDialog) {
        handleClose();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  if (!isClient || !open) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      data-component="Popover"
      className={clsx(
        "backdrop:bg-(--color-modal-backdrop)",
        background === "blurred" && "backdrop:backdrop-blur-xs",
        background === "dim" && "backdrop:bg-popover-dim",
        "p-0 border-0 bg-transparent max-w-none max-h-none",
        "fixed inset-0 m-auto w-fit h-fit",
      )}
    >
      <div
        className={clsx(
          "max-h-[90vh] max-w-full overflow-auto bg-white p-8 rounded",
          "border-1 border-gray-200",
          className,
        )}
      >
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
