"use client";

import { ReactNode, useCallback, useState } from "react";
import CookiePopover from "./CookiePopover";

export default function CookiePopoverLink({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  return (
    <>
      <a onClick={onOpen}>{children}</a>
      <CookiePopover open={open} onClose={onClose} />
    </>
  );
}
