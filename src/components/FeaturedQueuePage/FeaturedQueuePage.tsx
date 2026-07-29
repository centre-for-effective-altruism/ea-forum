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

type Decision = "feature" | "dismiss";

// Each post carries at most one decision, so feature and dismiss are mutually
// exclusive by construction. Toggling the current decision clears it.
const withDecision = (
  decisions: ReadonlyMap<string, Decision>,
  id: string,
  decision: Decision,
): Map<string, Decision> => {
  const next = new Map(decisions);
  if (next.get(id) === decision) {
    next.delete(id);
  } else {
    next.set(id, decision);
  }
  return next;
};

export default function FeaturedQueuePage({
  posts,
}: Readonly<{
  posts: FeaturedQueueItem[];
}>) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<ReadonlyMap<string, Decision>>(
    new Map(),
  );
  const [cursor, setCursor] = useState(0);
  const [publishing, setPublishing] = useState(false);

  const toggleFeature = useCallback((id: string) => {
    setDecisions((d) => withDecision(d, id, "feature"));
  }, []);

  const toggleDismiss = useCallback((id: string) => {
    setDecisions((d) => withDecision(d, id, "dismiss"));
  }, []);

  useGlobalKeydown(
    useCallback(
      (ev: KeyboardEvent) => {
        const tag = (ev.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || ev.metaKey || ev.ctrlKey) {
          return;
        }
        const key = ev.key.toLowerCase();
        const post = posts[cursor];
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
          if (post) toggleFeature(post._id);
        } else if (key === "x") {
          ev.preventDefault();
          if (post) toggleDismiss(post._id);
        } else if (key === "o") {
          ev.preventDefault();
          if (post) openPostInNewTab(post);
        }
      },
      [posts, cursor, toggleFeature, toggleDismiss],
    ),
  );

  const publish = useCallback(async () => {
    if (decisions.size === 0 || publishing) {
      return;
    }
    const featurePostIds: string[] = [];
    const dismissPostIds: string[] = [];
    for (const [id, decision] of decisions) {
      (decision === "feature" ? featurePostIds : dismissPostIds).push(id);
    }
    setPublishing(true);
    const toastId = toast.loading("Publishing to homepage...");
    try {
      const { featuredCount, dismissedCount } = await rpc.featuredQueue.publish({
        featurePostIds,
        dismissPostIds,
      });
      toast.success(`Featured ${featuredCount} · dismissed ${dismissedCount}`);
      setDecisions(new Map());
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
  }, [decisions, publishing, router]);

  const decisionCount = decisions.size;
  const featuredCount = [...decisions.values()].filter(
    (d) => d === "feature",
  ).length;
  const dismissedCount = decisionCount - featuredCount;

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
              : `Feature ${featuredCount} · dismiss ${dismissedCount}`}
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
            featured={decisions.get(post._id) === "feature"}
            dismissed={decisions.get(post._id) === "dismiss"}
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
