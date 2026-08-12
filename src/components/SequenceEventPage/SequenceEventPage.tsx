"use client";

import { CSSProperties, useCallback } from "react";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import type { SequenceEventConfig } from "@/lib/sequences/sequenceEvents";
import { sequenceEventUrl } from "@/lib/sequences/sequenceEvents";
import type { SequenceEventData } from "@/lib/sequences/sequenceEventQueries";
import clsx from "clsx";
import SequenceEventSubscribeButton from "./SequenceEventSubscribeButton";
import SequenceEventListItem from "./SequenceEventListItem";
import SequenceEventCard from "./SequenceEventCard";
import ShareButton from "../ShareButton";
import Link from "../Link";
import Type, { typeStyles } from "../Type";
import SpeakerWaveIcon from "@heroicons/react/24/outline/SpeakerWaveIcon";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";

/** Posts beyond this many are shown in the list below the cards */
const CARD_COUNT = 10;

const optionClasses = clsx(
  typeStyles.bodyMedium,
  `
    tracking-[-0.02em] leading-[140%] cursor-pointer
    flex items-center gap-2 rounded-sm px-2 py-1
    transition-colors duration-200
    hover:bg-always-black/10 [&_svg]:w-5 [&_svg]:h-5
  `,
);

export default function SequenceEventPage({
  config,
  sequence,
  posts,
}: Readonly<
  {
    config: SequenceEventConfig;
  } & SequenceEventData
>) {
  const { currentUser } = useCurrentUser();
  const { captureEvent } = useTracking();
  const onListen = useCallback(() => captureEvent("listenClick"), [captureEvent]);
  const onEdit = useCallback(() => captureEvent("editClick"), [captureEvent]);

  const cardPosts = posts.slice(0, CARD_COUNT);
  const listPosts = posts.slice(CARD_COUNT);

  return (
    <AnalyticsContext pageContext={config.analyticsPageContext}>
      <div
        data-component="SequenceEventPage"
        style={
          {
            "--sequence-theme": config.themeColor,
            "--sequence-hover": config.hoverColor,
            "--sequence-text": config.textColor ?? "var(--color-always-black)",
          } as CSSProperties
        }
        className="
          font-sans bg-always-white text-[var(--sequence-text)]
          w-full min-h-screen
        "
      >
        <div className="max-w-[1800px] mx-auto bg-always-black border-x border-always-black">
          <div
            className="
              grid grid-cols-3 max-[960px]:grid-cols-2 max-[700px]:grid-cols-1
              gap-px border-t border-always-black
            "
          >
            <div
              className="
                bg-[var(--sequence-theme)] col-span-2 max-[700px]:col-span-1
                flex flex-col gap-[50px] px-15 py-[65px]
                max-[700px]:p-10 max-[600px]:px-5 max-[600px]:py-10
                [&>*]:max-w-[min(700px,100%)]
              "
            >
              <div className="flex gap-4 flex-wrap whitespace-nowrap">
                {config.listenUrl && (
                  <Link
                    href={config.listenUrl}
                    onClick={onListen}
                    openInNewTab
                    className={optionClasses}
                  >
                    <SpeakerWaveIcon /> Listen to the posts
                  </Link>
                )}
                <SequenceEventSubscribeButton
                  sequenceId={sequence._id}
                  className={optionClasses}
                />
                <ShareButton
                  title={config.title}
                  url={sequenceEventUrl(config)}
                  clickEventName="shareClick"
                  campaign={config.shareCampaign}
                  label="Share"
                  className={optionClasses}
                />
                {currentUser?.isAdmin && (
                  <Link
                    href={`/s/${sequence._id}`}
                    onClick={onEdit}
                    className={optionClasses}
                  >
                    <PencilIcon /> Edit
                  </Link>
                )}
              </div>
              <Type As="h1" style="sequenceEventTitle">
                {sequence.title}
              </Type>
              {sequence.contentsRevision?.html && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sequence.contentsRevision.html,
                  }}
                  className={clsx(
                    typeStyles.sequenceEventDescription,
                    "[&_a]:underline [&_a]:font-[600] [&_a]:underline-offset-[3px]",
                  )}
                />
              )}
            </div>
            {cardPosts.map((post) => (
              <SequenceEventCard post={post} key={post._id} />
            ))}
          </div>
          <div
            className="
              w-full grid grid-cols-[min-content_1fr] max-[960px]:grid-cols-1
              gap-0 gap-y-px mt-px
            "
          >
            {listPosts.map((post) => (
              <SequenceEventListItem post={post} key={post._id} />
            ))}
          </div>
        </div>
      </div>
    </AnalyticsContext>
  );
}
