"use client";

import { useState } from "react";
import type { TopicContributor } from "@/lib/tags/topicContributors";
import { useTopicContributorHighlight } from "./TopicContributorHighlightProvider";
import clsx from "clsx";
import TextLinkButton from "../TextLinkButton";
import UsersName from "../UsersName";
import Tooltip from "../Tooltip";
import Type from "../Type";

const INITIAL_CONTRIBUTORS_SHOWN = 7;

const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? "" : "s"}`;

export default function TopicContributorsList({
  contributors,
  className,
}: Readonly<{
  contributors: TopicContributor[];
  className?: string;
}>) {
  const [showAll, setShowAll] = useState(false);
  const { hoveredContributorId, setHoveredContributorId } =
    useTopicContributorHighlight();
  const shown = showAll
    ? contributors
    : contributors.slice(0, INITIAL_CONTRIBUTORS_SHOWN);
  const canShowMore = contributors.length > INITIAL_CONTRIBUTORS_SHOWN;

  return (
    <div
      data-component="TopicContributorsList"
      className={clsx("flex flex-col gap-1", className)}
    >
      <Type style="bodyMedium" className="text-gray-1000 mb-1">
        Contributors
      </Type>
      {shown.map(({ user, contributionScore, voteCount, numCommits }) => (
        <div
          key={user._id}
          onMouseEnter={() => setHoveredContributorId(user._id)}
          onMouseLeave={() => setHoveredContributorId(null)}
          onFocus={() => setHoveredContributorId(user._id)}
          onBlur={() => setHoveredContributorId(null)}
          className={clsx(
            "flex items-center gap-2 rounded px-1 py-0.5",
            hoveredContributorId === user._id
              ? "bg-gray-100 text-gray-1000"
              : "text-gray-600",
          )}
        >
          <Tooltip
            As="span"
            placement="left"
            title={
              <Type style="bodySmall">
                {pluralize(Math.round(contributionScore), "point")} from{" "}
                {pluralize(voteCount, "vote")} on {pluralize(numCommits, "edit")}
              </Type>
            }
          >
            <Type As="span" className="inline-block w-6 text-center">
              {Math.round(contributionScore)}
            </Type>
          </Tooltip>
          <Type As="span" className="min-w-0 truncate">
            <UsersName user={user} pageSectionContext="topicContributors" />
          </Type>
        </div>
      ))}
      {canShowMore && (
        <TextLinkButton
          className="self-start mt-1"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show less" : `Show all (${contributors.length})`}
        </TextLinkButton>
      )}
    </div>
  );
}
