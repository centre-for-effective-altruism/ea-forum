"use client";

import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Type from "./Type";

export default function TruncationContainer({
  items,
  gap,
  className,
}: Readonly<{
  items: ReactNode[];
  gap: number;
  className?: string;
}>) {
  const [numShown, setNumShown] = useState(1);
  const [showAfterNode, setShowAfterNode] = useState(numShown < items.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const showAll = useCallback(() => {
    setNumShown(items.length);
    setShowAfterNode(false);
  }, [items]);

  const recalculate = useCallback(() => {
    if (numShown >= items.length || !items.length) {
      return;
    }

    const container = containerRef.current;
    const measureContainer = measureRef.current;
    if (!container || !measureContainer) {
      return;
    }

    const children = Array.from(measureContainer.children);
    const afterNode = children[children.length - 1];
    const itemNodes = children.slice(0, children.length - 1);

    const containerWidth = container.getBoundingClientRect().width;
    const afterNodeWidth = afterNode.getBoundingClientRect().width;
    const itemNodeWidths = itemNodes.map(
      (node) => node.getBoundingClientRect().width,
    );

    let total = 1;
    let width = itemNodeWidths[0] + gap + afterNodeWidth;
    while (total < itemNodeWidths.length) {
      const nextItemWidth = itemNodeWidths[total];
      const nextWidth = width + nextItemWidth;
      if (nextWidth > containerWidth) {
        break;
      }
      total++;
      width = nextWidth;
    }

    setNumShown(total);
    setShowAfterNode(numShown < items.length);
  }, [items, numShown, gap]);

  useEffect(() => {
    recalculate();
    window.addEventListener("resize", recalculate);
    return () => window.removeEventListener("resize", recalculate);
  }, [recalculate]);

  const shownItems = items.slice(0, numShown);
  const afterNode = (
    <Type
      onClick={showAll}
      role="button"
      className="flex items-center text-gray-600 pl-1 cursor-pointer"
    >
      {items.length} more
    </Type>
  );

  return (
    <>
      {/* Main visible container */}
      <div
        data-component="TruncationContainer"
        ref={containerRef}
        className={className}
      >
        {shownItems.map((item, i) => (
          <Fragment key={i}>{item}</Fragment>
        ))}
        {showAfterNode && afterNode}
      </div>
      {/* Hidden container for measuring hidden nodes */}
      <div
        ref={measureRef}
        className="absolute flex invisible h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
        inert
      >
        {items.map((item, i) => (
          <Fragment key={i}>{item}</Fragment>
        ))}
        {afterNode}
      </div>
    </>
  );
}
