import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { SequencePost } from "../sequences/sequenceQueries";
import { rpc } from "../rpc";

export const useSequencePosts = (
  sequenceId: string | null | undefined,
  skip = false,
) => {
  const [posts, setPosts] = useState<SequencePost[] | null>(null);

  useEffect(() => {
    if (skip) {
      return;
    }

    if (!sequenceId) {
      setPosts(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const result = await rpc.sequences.listPosts({ sequenceId });
        if (!cancelled) {
          setPosts(result ?? []);
        }
      } catch (e) {
        console.error("Error fetching sequence posts:", e);
        captureException(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [skip, sequenceId]);

  return {
    posts: posts ?? [],
    loading: posts === null,
  };
};
