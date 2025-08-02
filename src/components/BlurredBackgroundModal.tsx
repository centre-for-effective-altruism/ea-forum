"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ClickAwayListener from "react-click-away-listener";

export default function BlurredBackgroundModal({
  open,
  onClose,
  children,
}: Readonly<{
  open: boolean,
  onClose: () => void,
  children: ReactNode
}>) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.getElementById("modal-target")
    if (target) {
      setTarget(target);
    } else {
      console.error("Modal target not found");
    }
  }, [open]);


  if (!target || !open) {
    return null;
  }

  return createPortal(
    <div
      className={`
        absolute left-0 top-0 h-screen w-screen flex items-center justify-center
        z-1000 bg-(--color-login-backdrop) backdrop-blur-xs
      `}
      data-component="BlurredBackgroundModal"
    >
      <ClickAwayListener onClickAway={onClose}>
        <div className="w-[386px] max-h-[90vh] overflow-auto bg-white p-8 rounded">
          {children}
        </div>
      </ClickAwayListener>
    </div>,
    target
  );
}
