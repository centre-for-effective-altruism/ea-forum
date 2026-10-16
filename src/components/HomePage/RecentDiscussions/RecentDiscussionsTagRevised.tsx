"use client";

import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useIsInView } from "@/lib/hooks/useIsInView";
import { rpc } from "@/lib/rpc";
import type { RecentDiscussionRevision } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import TagDiffBody from "@/components/ContentStyles/TagDiffBody";
import RecentDiscussionsItem from "./RecentDiscussionsItem";
import ChangeMetrics from "@/components/ChangeMetrics";
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
          const diff = await rpc.tags.diff({ revisionId: revision._id });
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
          Edited by <UsersName user={user} />{" "}
          <ChangeMetrics changeMetrics={changeMetrics} verbose />
          {/* TODO: Revision vote buttons here */}
        </Type>
        {diff === null ? (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-300 w-full h-[120px] rounded" />
            <div className="bg-gray-200 w-full h-[120px] rounded" />
          </div>
        ) : (
          <TagDiffBody diff={diff} />
        )}
      </div>
    </RecentDiscussionsItem>
  );
}
