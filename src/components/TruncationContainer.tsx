"use client";

import {
  Fragment,
  ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
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
  afterNodeFormat?: (count: number, totalShown: number) => string;
  /** Node to appear after the "n more" text - this will never be hidden */
  finalNode?: ReactNode;
  /** Class applied to the root of this component  */
  className?: string;
  /** Class applied to the tooltip contents for the "n more" text */
  tooltipClassName?: string;
}>) {
  const [numShown, setNumShown] = useState(items.length);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const showAll = useCallback(() => {
    if (!canShowMore) {
      return;
    }
    setExpanded(true);
    setNumShown(items.length);
  }, [canShowMore, items.length]);

  // Use widest possible "n more" text for stable measurement.
  const measurementAfterText = useMemo(() => {
    if (items.length <= 1) {
      return "";
    }
    return afterNodeFormat(items.length - 1, 1);
  }, [afterNodeFormat, items.length]);

  const recalculate = useCallback(() => {
    if (expanded) {
      setNumShown(items.length);
      return;
    }

    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) {
      return;
    }

    const containerWidth = container.clientWidth;
    const children = Array.from(measure.children) as HTMLElement[];
    const itemNodes = children.slice(0, items.length);
    const afterNodeEl = children[items.length];
    const finalNodeEl = finalNode ? children[items.length + 1] : null;

    let trailingWidth = afterNodeEl.offsetWidth;
    if (finalNodeEl) {
      trailingWidth =
        finalNodeEl.offsetLeft + finalNodeEl.offsetWidth - afterNodeEl.offsetLeft;
    }

    if (trailingWidth > containerWidth) {
      setNumShown(0);
      return;
    }

    let shown = 0;
    for (const node of itemNodes) {
      const itemsWidth =
        node.offsetLeft + node.offsetWidth - itemNodes[0].offsetLeft;
      const totalWidth = itemsWidth + trailingWidth;
      if (totalWidth > containerWidth) {
        break;
      }
      shown++;
    }

    if (shown === items.length) {
      if (finalNodeEl) {
        const totalWidth =
          finalNodeEl.offsetLeft + finalNodeEl.offsetWidth - itemNodes[0].offsetLeft;
        if (totalWidth <= containerWidth) {
          setNumShown(items.length);
          return;
        }
      } else {
        const lastItem = itemNodes[itemNodes.length - 1];
        const totalWidth =
          lastItem.offsetLeft + lastItem.offsetWidth - itemNodes[0].offsetLeft;
        if (totalWidth <= containerWidth) {
          setNumShown(items.length);
          return;
        }
      }
    }

    setNumShown(shown);
  }, [expanded, finalNode, items.length]);

  useLayoutEffect(recalculate, [recalculate]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [recalculate]);

  const shownItems = items.slice(0, numShown);
  const hiddenItems = items.slice(numShown);

  const afterNode =
    hiddenItems.length > 0 ? (
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
          className={clsx(
            "inline-flex items-center text-gray-600",
            canShowMore && "cursor-pointer",
          )}
          {...(canShowMore
            ? {
                onClick: showAll,
                role: "button",
                tabIndex: 0,
              }
            : {})}
        >
          {afterNodeFormat(hiddenItems.length, numShown)}
        </Type>
      </Tooltip>
    ) : null;

  return (
    <>
      {/* Main visible container */}
      <div
        data-component="TruncationContainer"
        ref={containerRef}
        style={{ gap }}
        className={clsx(
          "flex items-center whitespace-nowrap overflow-hidden min-w-0",
          className,
        )}
      >
        {shownItems.map((item, i) => (
          <Fragment key={i}>{item}</Fragment>
        ))}
        {afterNode}
        {finalNode}
      </div>

      {/* Hidden container for measurements */}
      <div
        ref={measureRef}
        inert
        aria-hidden="true"
        style={{ gap }}
        className="
          absolute invisible pointer-events-none flex items-center h-0
          whitespace-nowrap overflow-hidden
        "
      >
        {items.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
        <span>
          <Type
            style={afterNodeTextStyle}
            className="inline-flex items-center text-gray-600"
          >
            {measurementAfterText}
          </Type>
        </span>
        {finalNode && <span>{finalNode}</span>}
      </div>
    </>
  );
}
