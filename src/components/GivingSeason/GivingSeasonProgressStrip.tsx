"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  GivingSeasonWeek,
  givingSeasonWeeks,
  isGivingSeasonWeekPast,
} from "@/lib/givingSeason/givingSeason2026";
import Type from "../Type";
import clsx from "clsx";

const EDGE_FADE_PX = 40;

function StripItem({
  week,
  selected,
  past,
  onSelect,
  innerRef,
}: Readonly<{
  week: GivingSeasonWeek;
  selected: boolean;
  past: boolean;
  onSelect: (week: GivingSeasonWeek, item: HTMLButtonElement) => void;
  innerRef?: (el: HTMLButtonElement | null) => void;
}>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(event) => onSelect(week, event.currentTarget)}
      ref={innerRef}
      className={clsx(
        "group shrink-0 cursor-pointer rounded-full p-[3px] border outline-none",
        selected
          ? "border-(--week-lead) focus-visible:outline-1 focus-visible:outline-solid focus-visible:outline-white/40 focus-visible:outline-offset-2"
          : "border-transparent",
      )}
    >
      <span
        className={clsx(
          "flex items-center gap-2 px-3 py-[5px] rounded-full border whitespace-nowrap",
          selected
            ? "border-(--week-lead) bg-(--week-deep) shadow-[0_0_12px_color-mix(in_srgb,var(--week-lead)_45%,transparent)]"
            : "border-transparent group-hover:border-white/40 group-focus-visible:border-white/40",
        )}
      >
        {selected ? (
          <Type As="span" style="bodyHeavy" className="text-(--week-tint)">
            {week.stripLabel}
          </Type>
        ) : (
          <>
            <Type
              As="span"
              style="bodyMedium"
              className={clsx(
                "group-hover:text-white group-focus-visible:text-white",
                past ? "text-white/80" : "text-white/50",
              )}
            >
              {week.stripLabel}
            </Type>
            <Type
              As="span"
              style="bodySmall"
              className={clsx(
                "font-[400]! group-hover:text-white/55 group-focus-visible:text-white/55",
                past ? "text-white/55" : "text-white/35",
              )}
            >
              {week.stripDate}
            </Type>
          </>
        )}
      </span>
    </button>
  );
}

export default function GivingSeasonProgressStrip({
  now,
  selectedWeek,
  onSelect,
}: Readonly<{
  now: Date;
  selectedWeek: GivingSeasonWeek | null;
  onSelect: (week: GivingSeasonWeek) => void;
}>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement | null>(null);

  const [fadeStart, setFadeStart] = useState(false);
  const [fadeEnd, setFadeEnd] = useState(false);

  const updateFades = useCallback(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      const { scrollLeft, clientWidth, scrollWidth } = scroller;
      setFadeStart(scrollLeft > 1);
      setFadeEnd(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const selectedItem = selectedItemRef.current;
    if (!scroller) {
      return;
    }
    if (selectedItem) {
      scroller.scrollLeft =
        selectedItem.offsetLeft -
        (scroller.clientWidth - selectedItem.offsetWidth) / 2;
    }
    updateFades();
    const observer = new ResizeObserver(updateFades);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [updateFades]);

  const onSelectItem = useCallback(
    (week: GivingSeasonWeek, item: HTMLButtonElement) => {
      onSelect(week);
      requestAnimationFrame(() => {
        const scroller = scrollerRef.current;
        if (!scroller) {
          return;
        }
        const minScroll =
          item.offsetLeft + item.offsetWidth + EDGE_FADE_PX - scroller.clientWidth;
        const maxScroll = item.offsetLeft - EDGE_FADE_PX;
        const target = Math.min(Math.max(scroller.scrollLeft, minScroll), maxScroll);
        if (target !== scroller.scrollLeft) {
          scroller.scrollTo({
            left: target,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }
      });
    },
    [onSelect],
  );

  return (
    <div
      className="
        bg-(--week-strip) border-t border-white/8
        transition-colors duration-200 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none
      "
    >
      <div
        ref={scrollerRef}
        onScroll={updateFades}
        style={{
          maskImage: `linear-gradient(to right, transparent, black ${
            fadeStart ? EDGE_FADE_PX : 0
          }px, black calc(100% - ${fadeEnd ? EDGE_FADE_PX : 0}px), transparent)`,
        }}
        className="relative h-13 flex items-center gap-[10px] px-[26px] overflow-x-auto no-scrollbars"
      >
        {givingSeasonWeeks.map((week, i) => (
          <Fragment key={week.id}>
            {i > 0 && (
              <span aria-hidden className="shrink-0">
                <Type As="span" style="bodyMedium" className="text-white/28">
                  →
                </Type>
              </span>
            )}
            <StripItem
              week={week}
              selected={week.id === selectedWeek?.id}
              past={isGivingSeasonWeekPast(week, now)}
              onSelect={onSelectItem}
              innerRef={
                week.id === selectedWeek?.id
                  ? (el) => {
                      selectedItemRef.current = el;
                    }
                  : undefined
              }
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
