"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { Toaster } from "react-hot-toast";
import clsx from "clsx";

/**
 * Managed React wrapper around HTML dialog. Dialogs are designed to be used
 * impreatively, so adding a functional wrapper requires careful state
 * management. Be careful when changing the effects here - it's very easy
 * to break the onClose callback.
 */
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
  // Track if we're mounted to avoid trying to create a portal during SSR
  const [mounted, setMounted] = useState(false);
  // We're ready when event listeners are attached and we're ready to open
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.target === dialog) {
        // Backdrop click
        onClose();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("pointerdown", handlePointerDown);
    setReady(true);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("pointerdown", handlePointerDown);
      setReady(false);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [ready, open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <FocusTrap active={open} focusTrapOptions={{ fallbackFocus: "dialog" }}>
      <dialog
        ref={dialogRef}
        tabIndex={-1}
        data-component="Popover"
        className={clsx(
          background === "blurred" && "backdrop:backdrop-blur-xs",
          background === "dim" && "backdrop:bg-popover-dim",
          "p-0 border-0 bg-transparent max-w-full max-h-screen",
          "fixed inset-0 m-auto w-fit h-fit",
        )}
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
        {/* Ensure toasts are position above the backdrop */}
        {open && <Toaster position="bottom-center" />}
      </dialog>
    </FocusTrap>,
    document.body,
  );
}
