"use client";

import { useState, ComponentType, FC, ReactNode } from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingNode,
  limitShift,
  offset,
  safePolygon,
  shift,
  useFloating,
  useFloatingNodeId,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import ChevronRightIcon from "@heroicons/react/16/solid/ChevronRightIcon";
import DropdownMenuItems from "./DropdownMenuItems";
import ToggleSwitch from "../Forms/ToggleSwitch";
import Type from "../Type";
import Link from "../Link";

export type DropdownMenuItem = DropdownItemProps | "divider" | null;

export type DropdownItemProps = {
  title: string;
  Icon?: ComponentType<{ className: string }>;
  href?: string;
  checked?: boolean;
  toggled?: boolean;
  onClick?: () => void | Promise<void>;
  submenu?: DropdownMenuItem[];
};

const SubmenuItemWrapper: FC<{
  submenu: DropdownMenuItem[];
  className?: string;
  children: ReactNode;
}> = ({ submenu, className, children }) => {
  const [open, setOpen] = useState(false);
  const nodeId = useFloatingNodeId();
  const { refs, floatingStyles, context } = useFloating({
    nodeId,
    open,
    onOpenChange: setOpen,
    placement: "right-start",
    middleware: [
      flip(),
      shift({ padding: 0, limiter: limitShift() }),
      offset({ mainAxis: 12, crossAxis: -9 }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, {
    handleClose: safePolygon(),
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
  return (
    <FloatingNode id={nodeId}>
      <button ref={refs.setReference} {...getReferenceProps()} className={className}>
        {children}
        <ChevronRightIcon className="w-4 text-gray-600" />
      </button>
      {open && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            // eslint-disable-next-line react-hooks/refs
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-(--zindex-dropdown)"
          >
            <DropdownMenuItems items={submenu} />
          </div>
        </FloatingFocusManager>
      )}
    </FloatingNode>
  );
};

const DropdownItemWrapper: FC<{
  href?: string;
  onClick?: () => void | Promise<void>;
  submenu?: DropdownMenuItem[];
  className?: string;
  children: ReactNode;
}> = ({ href, onClick, submenu, className, children }) => {
  if (submenu) {
    return (
      <SubmenuItemWrapper submenu={submenu} className={className}>
        {children}
      </SubmenuItemWrapper>
    );
  }
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
};

export default function DropdownItem({
  title,
  Icon,
  href,
  checked,
  toggled,
  onClick,
  submenu,
}: Readonly<DropdownItemProps>) {
  return (
    <DropdownItemWrapper
      href={href}
      onClick={onClick}
      submenu={submenu}
      className="
        rounded p-2 cursor-pointer hover:bg-gray-100 outline-none w-full
        flex items-center justify-start gap-3 text-left
      "
    >
      {Icon && <Icon className="w-[20px] h-[20px] text-gray-600" />}
      <Type className="grow">{title}</Type>
      {checked && <CheckIcon className="w-4 text-primary" />}
      {typeof toggled === "boolean" && <ToggleSwitch value={toggled} />}
    </DropdownItemWrapper>
  );
}
