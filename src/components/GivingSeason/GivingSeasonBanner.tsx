"use client";

import { CSSProperties, useCallback, useState } from "react";
import {
  getCurrentGivingSeasonWeek,
  GivingSeasonWeek,
  givingSeasonAnnouncementPostId,
  givingSeasonGapStripColor,
  givingSeasonWeeks,
} from "@/lib/givingSeason/givingSeason2026";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useDismissable } from "@/lib/hooks/useDismissable";
import { CookieName, HIDE_FORUM_EVENT_BANNER_PREFIX } from "@/lib/cookies/cookies";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import GivingSeasonProgressStrip from "./GivingSeasonProgressStrip";
import GivingSeasonBannerLines from "./GivingSeasonBannerLines";
import LazyPostsTooltip from "../LazyPostsTooltip";
import Link from "../Link";
import Type from "../Type";
import clsx from "clsx";

const dismissCookie =
  `${HIDE_FORUM_EVENT_BANNER_PREFIX}giving_season_2026` as CookieName;

const colorTransition =
  "transition-colors duration-200 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none";

const textBlockClassName =
  "relative col-start-1 row-start-1 max-w-120 p-[30px] pb-2.5 max-sm:pr-11 max-sm:pb-[30px] flex flex-col";

function WeekText({ week }: Readonly<{ week: GivingSeasonWeek }>) {
  return (
    <>
      <Type
        style="bodyMedium"
        className={clsx("text-[15px]! text-(--week-tint)", colorTransition)}
      >
        {week.bannerDate}
      </Type>
      <Type
        As="h2"
        style="bannerTitle"
        className={clsx(
          "leading-[1.2]! mt-[6px] mb-2 text-(--week-lead)",
          colorTransition,
        )}
      >
        {week.title}
      </Type>
      <Type style="body" className="font-[400]! leading-[1.5] text-white">
        {week.description}{" "}
        <LazyPostsTooltip postId={givingSeasonAnnouncementPostId} As="span">
          <Link
            href={week.postUrl}
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Read the announcement post.
          </Link>
        </LazyPostsTooltip>
      </Type>
    </>
  );
}

function WeekBanner({
  week,
  onDismiss,
}: Readonly<{
  week: GivingSeasonWeek;
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
      {givingSeasonWeeks
        .filter(({ id }) => id !== week.id)
        .map((sizingWeek) => (
          <div
            key={sizingWeek.id}
            aria-hidden
            className={clsx(textBlockClassName, "invisible")}
          >
            <WeekText week={sizingWeek} />
          </div>
        ))}
      <button
        type="button"
        aria-label="Hide banner"
        onClick={onDismiss}
        className="absolute top-3 right-3 cursor-pointer text-white"
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
  const { dismissed, dismiss } = useDismissable(dismissCookie);
  const [selectedWeek, setSelectedWeek] = useState(() =>
    getCurrentGivingSeasonWeek(now),
  );
  const [shownAfterDismissal, setShownAfterDismissal] = useState(false);

  const onSelect = useCallback(
    (week: GivingSeasonWeek) => {
      setSelectedWeek(week);
      setShownAfterDismissal(true);
      captureEvent("givingSeasonWeekSelected", { week: week.id });
    },
    [captureEvent],
  );

  const onDismiss = useCallback(() => {
    setShownAfterDismissal(false);
    dismiss();
  }, [dismiss]);

  const showBanner = selectedWeek && (!dismissed || shownAfterDismissal);
  const colorVariables = {
    "--week-lead": selectedWeek?.colors.lead,
    "--week-deep": selectedWeek?.colors.deep,
    "--week-tint": selectedWeek?.colors.tint,
    "--week-strip": selectedWeek?.colors.strip ?? givingSeasonGapStripColor,
  } as CSSProperties;

  return (
    <AnalyticsContext pageSectionContext="givingSeasonBanner">
      <section
        data-component="GivingSeasonBanner"
        aria-label="Giving Season"
        style={colorVariables}
      >
        {showBanner && <WeekBanner week={selectedWeek} onDismiss={onDismiss} />}
        <GivingSeasonProgressStrip
          now={now}
          selectedWeek={selectedWeek}
          onSelect={onSelect}
        />
      </section>
    </AnalyticsContext>
  );
}
