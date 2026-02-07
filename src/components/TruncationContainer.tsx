"use client";

import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Type, { TextStyle } from "./Type";
import Tooltip from "./Tooltip";
import clsx from "clsx";

export default function TruncationContainer({
  items,
  gap,
  canShowMore,
  hiddenItemsTooltip,
  afterNodeTextStyle,
  afterNodeFormat = (count) => `${count} more`,
  finalNode,
  className,
  tooltipClassName,
}: Readonly<{
  /** The items to display or hide if not enough room */
  items: ReactNode[];
  /** Gap in pixels between items */
  gap: number;
  /** Whether or not clicking the "n more" text reveals the hidden items */
  canShowMore?: boolean;
  /** If true, the "n more" text has a tooltip containing the hidden items */
  hiddenItemsTooltip?: boolean;
  /** Text style for the "n more" text  */
  afterNodeTextStyle?: TextStyle;
  /** Format the "n more" text */
  afterNodeFormat?: (count: number) => string;
  /** Node to appear after the "n more" text - this will never be hidden */
  finalNode?: ReactNode;
  /** Class applied to the root of this component  */
  className?: string;
  /** Class applied to the tooltip contents for the "n more" text */
  tooltipClassName?: string;
}>) {
  const [numShown, setNumShown] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const finalNodeRef = useRef<HTMLSpanElement>(null);

  const showAll = useCallback(() => {
    setNumShown(items.length);
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
    const finalNodeWidth = finalNodeRef.current?.getBoundingClientRect().width ?? 0;

    // Add 8px of leeway
    let width = itemNodeWidths[0] + gap + afterNodeWidth + finalNodeWidth + 8;
    let total = 1;
    while (total < itemNodeWidths.length) {
      const nextItemWidth = itemNodeWidths[total];
      const nextWidth = width + gap + nextItemWidth;
      if (nextWidth > containerWidth) {
        break;
      }
      total++;
      width = nextWidth;
    }

    setNumShown(total);
  }, [items, numShown, gap]);

  useEffect(() => {
    queueMicrotask(recalculate);
    window.addEventListener("resize", recalculate);
    return () => window.removeEventListener("resize", recalculate);
  }, [recalculate]);

  const shownItems = items.slice(0, numShown);
  const hiddenItems = items.slice(numShown);
  const afterNode = (
    <Tooltip
      As="span"
      placement="bottom-start"
      tooltipClassName={tooltipClassName}
      title={
        hiddenItemsTooltip ? (
          <Type style="bodySmall">
            {hiddenItems.map((item, i) => (
              <div key={i}>{item}</div>
            ))}
          </Type>
        ) : null
      }
    >
      <Type
        style={afterNodeTextStyle}
        className="inline-flex items-center text-gray-600 pl-1 cursor-pointer"
        {...(canShowMore ? { onClick: showAll, role: "button" } : {})}
      >
        {afterNodeFormat(items.length - numShown)}
      </Type>
    </Tooltip>
  );

  return (
    <>
      {/* Main visible container */}
      <div
        data-component="TruncationContainer"
        style={{ gap: `${gap}px` }}
        ref={containerRef}
        className={clsx("flex items-center", className)}
      >
        {shownItems.map((item, i) => (
          <Fragment key={i}>{item}</Fragment>
        ))}
        {numShown < items.length && afterNode}
        {finalNode && <span ref={finalNodeRef}>{finalNode}</span>}
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
