"use client";

import type { ReactNode } from "react";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

export default function ConfirmationPopover({
  open,
  title,
  onConfirm,
  onClose,
  children,
}: Readonly<{
  open: boolean;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}>) {
  return (
    <Popover open={open} onClose={onClose} className="flex flex-col gap-4 w-[500px]">
      <Type style="sectionTitleLarge">{title}</Type>
      {children}
      <div className="flex items-center justify-end gap-2">
        <Button variant="greyOutlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primaryFilled"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Confirm
        </Button>
      </div>
    </Popover>
  );
}
