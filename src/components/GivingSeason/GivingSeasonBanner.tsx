"use client";

import { CSSProperties, useCallback, useState, useSyncExternalStore } from "react";
import {
  getCurrentGivingSeasonWeek,
  GivingSeasonBannerContent,
  GivingSeasonWeek,
  givingSeasonAnnouncementPostId,
  givingSeasonBannerDismissCookie,
  givingSeasonGeneralBanner,
  givingSeasonWeeks,
  isGivingSeasonOver,
} from "@/lib/givingSeason/givingSeason2026";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useDismissable } from "@/lib/hooks/useDismissable";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import ChevronDownIcon from "@heroicons/react/24/solid/ChevronDownIcon";
import GivingSeasonProgressStrip, {
  colorTransition,
} from "./GivingSeasonProgressStrip";
import GivingSeasonBannerLines from "./GivingSeasonBannerLines";
import LazyPostsTooltip from "../LazyPostsTooltip";
import Link from "../Link";
import Type from "../Type";
import clsx from "clsx";

const textBlockClassName =
  "relative col-start-1 row-start-1 max-w-120 p-[30px] pb-2.5 max-sm:pr-11 max-sm:pb-[30px] flex flex-col";

const allBanners: GivingSeasonBannerContent[] = [
  givingSeasonGeneralBanner,
  ...givingSeasonWeeks,
];

function WeekText({
  week,
  sizer,
}: Readonly<{ week: GivingSeasonBannerContent; sizer?: boolean }>) {
  return (
    <>
      <Type
        style="bodyMedium"
        className={clsx("text-[15px]! text-(--week-date)", colorTransition)}
      >
        {week.bannerDate}
      </Type>
      <Type
        As="h2"
        style="bannerTitle"
        className={clsx(
          "leading-[1.2]! mt-[6px] mb-2 text-(--week-title)",
          colorTransition,
        )}
      >
        {week.title}
      </Type>
      <Type style="body" className="font-[400]! leading-[1.5] text-white">
        {week.description} (
        {sizer ? (
          "more info"
        ) : (
          <LazyPostsTooltip postId={givingSeasonAnnouncementPostId} As="span">
            <Link
              href={week.postUrl}
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              more info
            </Link>
          </LazyPostsTooltip>
        )}
        )
      </Type>
    </>
  );
}

function WeekSizers() {
  return allBanners.map((week) => (
    <div key={week.id} aria-hidden className={clsx(textBlockClassName, "invisible")}>
      <WeekText week={week} sizer />
    </div>
  ));
}

function WeekBanner({
  week,
  onDismiss,
}: Readonly<{
  week: GivingSeasonBannerContent;
  onDismiss: () => void;
}>) {
  return (
    <div
      className={clsx(
        "relative grid min-h-45 overflow-hidden bg-(--week-deep)",
        colorTransition,
      )}
    >
      <GivingSeasonBannerLines colors={week.colors} className={textBlockClassName}>
        <WeekText week={week} />
      </GivingSeasonBannerLines>
      <WeekSizers />
      <button
        type="button"
        aria-label="Hide banner"
        onClick={onDismiss}
        className="absolute top-3 right-3 cursor-pointer text-white hover:opacity-70 transition-opacity"
      >
        <XMarkIcon className="w-5" />
      </button>
    </div>
  );
}

export default function GivingSeasonBanner({
  now: nowMs,
}: Readonly<{
  now: number;
}>) {
  const now = new Date(nowMs);
  const { captureEvent } = useTracking();
  const { dismissed, dismiss, undismiss } = useDismissable(
    givingSeasonBannerDismissCookie,
  );
  const [selectedWeek, setSelectedWeek] = useState(() =>
    getCurrentGivingSeasonWeek(now),
  );
  const [shownAfterDismissal, setShownAfterDismissal] = useState(false);

  const onSelect = useCallback(
    (week: GivingSeasonWeek) => {
      const deselect = week.id === selectedWeek?.id;
      setSelectedWeek(deselect ? null : week);
      setShownAfterDismissal(true);
      captureEvent(
        deselect ? "givingSeasonWeekDeselected" : "givingSeasonWeekSelected",
        { week: week.id },
      );
    },
    [captureEvent, selectedWeek],
  );

  const onDismiss = useCallback(() => {
    setShownAfterDismissal(false);
    dismiss();
  }, [dismiss]);

  const showBanner = !dismissed || shownAfterDismissal;
  const banner = selectedWeek ?? givingSeasonGeneralBanner;
  const colorVariables = {
    "--week-lead": selectedWeek?.colors.lead,
    "--week-tint": selectedWeek?.colors.tint,
    "--week-deep": banner.colors.deep,
    "--week-strip": banner.colors.strip,
    "--week-title": banner.colors.title,
    "--week-date": banner.colors.date,
  } as CSSProperties;

  return (
    <AnalyticsContext pageSectionContext="givingSeasonBanner">
      <section
        data-component="GivingSeasonBanner"
        aria-label="Giving Season"
        style={colorVariables}
      >
        {showBanner && <WeekBanner week={banner} onDismiss={onDismiss} />}
        <GivingSeasonProgressStrip
          now={now}
          selectedWeek={selectedWeek}
          onSelect={onSelect}
        >
          {!showBanner && (
            <button
              type="button"
              aria-label="Show banner"
              onClick={undismiss}
              className="shrink-0 mr-3 cursor-pointer text-white/50 hover:text-white transition-colors"
            >
              <ChevronDownIcon className="w-5" />
            </button>
          )}
        </GivingSeasonProgressStrip>
      </section>
    </AnalyticsContext>
  );
}

const subscribeToNothing = () => () => {};

/**
 * The skeleton is part of the static shell, so the dismissal cookie and the
 * current date are only checked once hydrated. Until then it assumes the
 * banner will be shown, as it is for most users.
 */
export function GivingSeasonBannerSkeleton() {
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [cookies] = useCookiesWithConsent([givingSeasonBannerDismissCookie]);
  const now = isHydrated ? new Date() : null;
  if (now && isGivingSeasonOver(now)) {
    return null;
  }
  const showBanner = !now || cookies[givingSeasonBannerDismissCookie] !== "true";
  return (
    <div aria-hidden data-component="GivingSeasonBannerSkeleton">
      {showBanner && (
        <div className="grid min-h-45 bg-gray-200">
          <WeekSizers />
        </div>
      )}
      <div className="h-13 box-content border-t border-transparent bg-gray-300" />
    </div>
  );
}
