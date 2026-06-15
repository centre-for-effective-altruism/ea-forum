import { ReactNode, useCallback, useRef } from "react";
import Transition from "react-transition-group/Transition";
import clsx from "clsx";

export default function Collapse({
  open,
  timeout = 0,
  onEnter,
  onEntered,
  onEntering,
  onExit,
  onExiting,
  className,
  children,
}: Readonly<{
  open: boolean;
  timeout?: number;
  onEnter?: (node: HTMLDivElement | null) => void;
  onEntered?: (node: HTMLDivElement | null) => void;
  onEntering?: (node: HTMLDivElement | null) => void;
  onExit?: (node: HTMLDivElement | null) => void;
  onExiting?: (node: HTMLDivElement | null) => void;
  className?: string;
  children: ReactNode;
}>) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleEnter = useCallback(() => {
    if (nodeRef.current) {
      nodeRef.current.style.height = "0px";
    }
    onEnter?.(nodeRef.current);
  }, [onEnter]);

  const handleEntering = useCallback(() => {
    const wrapperHeight = wrapperRef.current ? wrapperRef.current.clientHeight : 0;
    const transitionDuration = timeout;
    if (nodeRef.current) {
      nodeRef.current.style.transitionDuration =
        typeof transitionDuration === "string"
          ? transitionDuration
          : `${transitionDuration}ms`;
      nodeRef.current.style.height = `${wrapperHeight}px`;
    }
    onEntering?.(nodeRef.current);
  }, [onEntering, timeout]);

  const handleEntered = useCallback(() => {
    if (nodeRef.current) {
      nodeRef.current.style.height = "auto";
    }
    onEntered?.(nodeRef.current);
  }, [onEntered]);

  const handleExit = useCallback(() => {
    const wrapperHeight = wrapperRef.current ? wrapperRef.current.clientHeight : 0;
    if (nodeRef.current) {
      nodeRef.current.style.height = `${wrapperHeight}px`;
    }
    onExit?.(nodeRef.current);
  }, [onExit]);

  const handleExiting = useCallback(() => {
    const transitionDuration = timeout;
    if (nodeRef.current) {
      nodeRef.current.style.transitionDuration =
        typeof transitionDuration === "string"
          ? transitionDuration
          : `${transitionDuration}ms`;
      nodeRef.current.style.height = "0px";
    }
    onExiting?.(nodeRef.current);
  }, [onExiting, timeout]);

  return (
    <Transition
      onEnter={handleEnter}
      onEntered={handleEntered}
      onEntering={handleEntering}
      onExit={handleExit}
      onExiting={handleExiting}
      timeout={timeout}
      nodeRef={nodeRef}
      in={open}
    >
      {(state, childProps) => (
        <div
          data-component="Collapse"
          className={clsx(
            "transition-[height] duration-[300ms] ease-[cubic-bezier(.4,0,.2,1)]",
            "overflow-hidden",
            state !== "entered" && "h-0",
            className,
          )}
          style={{ minHeight: "0px" }}
          ref={nodeRef}
          {...childProps}
        >
          {/*
           *`flex` here is a hack to get children with a negative margin to not
           * falsify the height computation
           */}
          <div className="flex" ref={wrapperRef}>
            <div className="w-full">{children}</div>
          </div>
        </div>
      )}
    </Transition>
  );
}
