import { ReactNode, useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";

export default function Tooltip({
  className,
  title,
  children,
}: Readonly<{
  className?: string;
  title: ReactNode;
  children: ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
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
      <div ref={refs.setReference} {...getReferenceProps()} className={className}>
        {children}
      </div>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className={`
            absolute bg-(--color-tooltip-background) text-gray-50 rounded
            px-2 py-1
          `}
        >
          {title}
        </div>
      )}
    </>
  );
}
