"use client";

import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { getTagDiffAction } from "@/lib/tags/tagActions";
import { useIsInView } from "@/lib/hooks/useIsInView";
import type { RecentDiscussionRevision } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import RecentDiscussionsItem from "./RecentDiscussionsItem";
import TagBody from "@/components/ContentStyles/TagBody";
import UsersName from "@/components/UsersName";
import Type from "@/components/Type";

export default function RecentDiscussionsTagRevised({
  revision,
}: Readonly<{
  revision: RecentDiscussionRevision;
}>) {
  const { setNode, entry } = useIsInView();
  const isOnScreen = entry?.isIntersecting;
  const [diff, setDiff] = useState<string | null>(null);
  const { user, tag, changeMetrics } = revision;

  useEffect(() => {
    if (revision.tag && isOnScreen && diff === null) {
      void (async () => {
        try {
          const diff = await getTagDiffAction(revision._id);
          setDiff(diff);
        } catch (error) {
          console.error("Failed to fetch tag diff:", error);
          captureException(error);
        }
      })();
    }
  }, [revision, isOnScreen, diff]);

  if (!tag) {
    return null;
  }

  const { name } = tag;
  const added = changeMetrics?.added ?? 0;
  const removed = changeMetrics?.removed ?? 0;
  return (
    <RecentDiscussionsItem
      icon="Tag"
      iconVariant="green"
      user={user}
      action="edited topic"
      tag={tag}
      timestamp={revision.editedAt ?? new Date().toISOString()}
    >
      <div className="flex flex-col gap-2" ref={setNode}>
        <Type style="sectionTitleLarge">{name}</Type>
        <Type className="italic text-gray-600">
          Edited by <UsersName user={user} /> (
          <span className="text-recent-discussions-green">+{added}</span>/
          <span className="text-warning">-{removed}</span> characters)
          {/* TODO: Revision vote buttons here */}
        </Type>
        {diff === null ? (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-300 w-full h-[120px] rounded" />
            <div className="bg-gray-200 w-full h-[120px] rounded" />
          </div>
        ) : (
          <TagBody
            html={diff}
            className="[&_ins]:bg-diff-added [&_del]:bg-diff-removed"
          />
        )}
      </div>
    </RecentDiscussionsItem>
  );
}
