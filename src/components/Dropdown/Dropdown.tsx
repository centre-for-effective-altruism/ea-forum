import { ReactNode, RefObject, useImperativeHandle, useState } from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  Placement,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";

export default function Dropdown({
  placement,
  menu,
  dismissRef,
  children,
}: Readonly<{
  placement?: Placement;
  menu: ReactNode;
  dismissRef?: RefObject<(() => void) | null>;
  children: ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [flip(), shift()],
    whileElementsMounted: autoUpdate,
    placement,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  useImperativeHandle(dismissRef, () => () => setIsOpen(false));

  return (
    <>
      <div
        className="inline-block"
        ref={setReference}
        {...getReferenceProps()}
        data-component="Dropdown"
      >
        {children}
      </div>
      {isOpen && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            data-component="Dropdown"
          >
            {menu}
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}
