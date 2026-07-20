"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import type { TagRevision } from "@/lib/tags/tagQueries";
import TagRevisionItem from "./TagRevisionItem";
import TextLinkButton from "../TextLinkButton";
import Loading from "../Loading";

export default function TagRevisionsList({
  initialRevisions,
  userId,
  canLoadMore: initialCanLoadMore,
}: Readonly<{
  initialRevisions: TagRevision[];
  userId: string;
  canLoadMore: boolean;
}>) {
  const [revisions, setRevisions] = useState(initialRevisions);
  const [canLoadMore, setCanLoadMore] = useState(initialCanLoadMore);
  const [loading, setLoading] = useState(false);

  const onLoadMore = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const limit = 10;
      const newRevisions = await rpc.tags.listUserProfile({
        userId,
        offset: revisions.length,
        limit,
      });
      setRevisions((revisions) => [...revisions, ...newRevisions]);
      if (newRevisions.length < limit) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error(e);
      captureException(e);
      setCanLoadMore(false);
    }
    setLoading(false);
  }, [userId, loading, revisions.length]);

  return (
    <div data-component="TagRevisionsList">
      {revisions.map((revision) => (
        <TagRevisionItem key={revision._id} tagRevision={revision} />
      ))}
      {canLoadMore && (
        <div className="mt-1">
          {loading ? (
            <Loading />
          ) : (
            <TextLinkButton onClick={onLoadMore}>Load more</TextLinkButton>
          )}
        </div>
      )}
    </div>
  );
}
