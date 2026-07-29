"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { useGlobalKeydown } from "@/lib/hooks/useGlobalKeydown";
import type { FeaturedQueueItem } from "@/lib/featuredQueue/featuredQueueQueries";
import Button from "../Button";
import Type from "../Type";
import FeaturedQueueRow from "./FeaturedQueueRow";

const KEY_HINTS: { key: string; label: string }[] = [
  { key: "J / K", label: "move" },
  { key: "F", label: "feature" },
  { key: "X", label: "dismiss" },
  { key: "O", label: "open" },
];

const openPostInNewTab = (post: FeaturedQueueItem) => {
  window.open(postGetPageUrl({ post }), "_blank", "noopener");
};

const withToggled = (ids: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

const without = (ids: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(ids);
  next.delete(id);
  return next;
};

export default function FeaturedQueuePage({
  posts,
}: Readonly<{
  posts: FeaturedQueueItem[];
}>) {
  const router = useRouter();
  const [featuredIds, setFeaturedIds] = useState<ReadonlySet<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [publishing, setPublishing] = useState(false);

  const toggleFeature = useCallback((id: string) => {
    setFeaturedIds((ids) => withToggled(ids, id));
    setDismissedIds((ids) => without(ids, id));
  }, []);

  const toggleDismiss = useCallback((id: string) => {
    setDismissedIds((ids) => withToggled(ids, id));
    setFeaturedIds((ids) => without(ids, id));
  }, []);

  useGlobalKeydown(
    useCallback(
      (ev: KeyboardEvent) => {
        const tag = (ev.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || ev.metaKey || ev.ctrlKey) {
          return;
        }
        const key = ev.key.toLowerCase();
        const move = (delta: number) =>
          setCursor((c) => Math.max(0, Math.min(posts.length - 1, c + delta)));
        if (key === "j" || key === "arrowdown") {
          ev.preventDefault();
          move(1);
        } else if (key === "k" || key === "arrowup") {
          ev.preventDefault();
          move(-1);
        } else if (key === "f") {
          ev.preventDefault();
          if (posts[cursor]) toggleFeature(posts[cursor]._id);
        } else if (key === "x") {
          ev.preventDefault();
          if (posts[cursor]) toggleDismiss(posts[cursor]._id);
        } else if (key === "o") {
          ev.preventDefault();
          if (posts[cursor]) openPostInNewTab(posts[cursor]);
        }
      },
      [posts, cursor, toggleFeature, toggleDismiss],
    ),
  );

  const publish = useCallback(async () => {
    const featurePostIds = [...featuredIds];
    const dismissPostIds = [...dismissedIds];
    if ((featurePostIds.length === 0 && dismissPostIds.length === 0) || publishing) {
      return;
    }
    setPublishing(true);
    const toastId = toast.loading("Publishing to homepage...");
    try {
      const { featuredCount, dismissedCount } = await rpc.featuredQueue.publish({
        featurePostIds,
        dismissPostIds,
      });
      toast.success(`Featured ${featuredCount} · dismissed ${dismissedCount}`);
      setFeaturedIds(new Set());
      setDismissedIds(new Set());
      setCursor(0);
      router.refresh();
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      toast.dismiss(toastId);
      setPublishing(false);
    }
  }, [featuredIds, dismissedIds, publishing, router]);

  const decisionCount = featuredIds.size + dismissedIds.size;

  return (
    <main
      data-component="FeaturedQueuePage"
      className="mx-auto w-full max-w-[1200px] px-4 pt-10 pb-[120px]"
    >
      <div className="mb-1 flex items-start justify-between gap-6">
        <div>
          <Type style="commentsHeader">Featured queue</Type>
          <div className="mt-0.5 text-[13px] font-[450] text-gray-600">
            Everything since your last review · feature the ones for the homepage,
            dismiss the rest · both clear the post from the queue
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 pt-1.5">
          <Button
            onClick={publish}
            disabled={decisionCount === 0 || publishing}
            loading={publishing}
          >
            Publish to homepage
          </Button>
          <div className="text-[12px] font-[500] text-gray-600">
            {decisionCount === 0
              ? "Feature or dismiss at least one post"
              : `Feature ${featuredIds.size} · dismiss ${dismissedIds.size}`}
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-gray-200 pt-3.5 pb-2.5 text-[12px] font-[500] text-gray-600">
        <div className="grow" />
        {KEY_HINTS.map(({ key, label }) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span className="rounded border border-gray-300 bg-gray-200 px-[5px] py-px text-[11px] font-[600] text-gray-700">
              {key}
            </span>
            {label}
          </span>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-md border border-gray-100 bg-gray-0 p-10 text-center">
          <Type style="bodyLarge">Queue empty</Type>
          <div className="mt-1.5 text-[13px] font-[450] text-gray-600">
            Nothing new to review right now.
          </div>
        </div>
      ) : (
        posts.map((post, index) => (
          <FeaturedQueueRow
            key={post._id}
            post={post}
            featured={featuredIds.has(post._id)}
            dismissed={dismissedIds.has(post._id)}
            selected={cursor === index}
            onSelect={() => setCursor(index)}
            onToggleFeature={() => toggleFeature(post._id)}
            onToggleDismiss={() => toggleDismiss(post._id)}
            onOpen={() => openPostInNewTab(post)}
          />
        ))
      )}

      <div className="mt-6 text-[12px] font-[500] leading-normal text-gray-600">
        Admins only. Featuring stamps{" "}
        <span className="font-mono text-[11px]">onsiteDigestAt</span> on the post,
        which is what the homepage Featured list reads. Dismissing records the digest
        tool&rsquo;s <span className="font-mono text-[11px]">&ldquo;X&rdquo;</span>{" "}
        (onsite digest status <span className="font-mono text-[11px]">no</span>), so
        the post won&rsquo;t come back here or into the digest.
      </div>
    </main>
  );
}
