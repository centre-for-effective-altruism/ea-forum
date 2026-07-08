import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { SequencePost } from "../sequences/sequenceQueries";
import { rpc } from "../rpc";

export const useCollectionPosts = (
  collectionId: string | null | undefined,
  skip = false,
) => {
  const [posts, setPosts] = useState<SequencePost[] | null>(null);

  useEffect(() => {
    if (skip) {
      return;
    }

    if (!collectionId) {
      setPosts(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const result = await rpc.collections.listPosts({ collectionId });
        if (!cancelled) {
          setPosts(result ?? []);
        }
      } catch (e) {
        console.error("Error fetching collection posts:", e);
        captureException(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [skip, collectionId]);

  return {
    posts: posts ?? [],
    loading: posts === null,
  };
};
