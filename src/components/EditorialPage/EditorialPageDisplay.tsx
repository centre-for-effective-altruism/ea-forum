"use client";

import { CSSProperties, useCallback } from "react";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import type { EditorialPageConfig } from "@/lib/sequences/editorialPages";
import { editorialPageUrl } from "@/lib/sequences/editorialPages";
import type { EditorialPageContent } from "@/lib/sequences/editorialPageContentQueries";
import { sequenceGetSequencePageUrl } from "@/lib/sequences/sequenceHelpers";
import clsx from "clsx";
import EditorialPageSubscribeButton from "./EditorialPageSubscribeButton";
import EditorialPageListItem from "./EditorialPageListItem";
import EditorialPageCard from "./EditorialPageCard";
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

export default function EditorialPageDisplay({
  config,
  sequence,
  posts,
}: Readonly<
  {
    config: EditorialPageConfig;
  } & EditorialPageContent
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
        data-component="EditorialPageDisplay"
        style={
          {
            "--editorial-theme": config.themeColor,
            "--editorial-hover": config.hoverColor,
            "--editorial-text": config.textColor,
          } as CSSProperties
        }
        className="
          font-sans bg-always-white text-[var(--editorial-text)]
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
                bg-[var(--editorial-theme)] col-span-2 max-[700px]:col-span-1
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
                <EditorialPageSubscribeButton
                  sequenceId={sequence._id}
                  className={optionClasses}
                />
                <ShareButton
                  title={config.title}
                  url={editorialPageUrl(config)}
                  clickEventName="shareClick"
                  campaign={config.shareCampaign}
                  label="Share"
                  placement="bottom-start"
                  className={optionClasses}
                />
                {currentUser?.isAdmin && (
                  <Link
                    href={sequenceGetSequencePageUrl({ sequence })}
                    onClick={onEdit}
                    className={optionClasses}
                  >
                    <PencilIcon /> Edit
                  </Link>
                )}
              </div>
              <Type As="h1" style="editorialPageTitle">
                {sequence.title}
              </Type>
              {sequence.contentsRevision?.html && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sequence.contentsRevision.html,
                  }}
                  className={clsx(
                    typeStyles.editorialPageDescription,
                    "[&_a]:underline [&_a]:font-[600] [&_a]:underline-offset-[3px]",
                  )}
                />
              )}
            </div>
            {cardPosts.map((post) => (
              <EditorialPageCard post={post} key={post._id} />
            ))}
          </div>
          <div className="flex flex-col gap-px mt-px">
            {listPosts.map((post) => (
              <EditorialPageListItem post={post} key={post._id} />
            ))}
          </div>
        </div>
      </div>
    </AnalyticsContext>
  );
}
