"use client";

import { useState } from "react";
import ControlledTooltip from "./ControlledTooltip";

export default function Tooltip({
  children,
  ...props
}: Omit<Parameters<typeof ControlledTooltip>[0], "isOpen" | "setIsOpen">) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ControlledTooltip {...props} isOpen={isOpen} setIsOpen={setIsOpen}>
      {children}
    </ControlledTooltip>
  );
}
