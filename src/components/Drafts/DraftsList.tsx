"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import type { PostListItem } from "@/lib/posts/postLists";
import {
  draftsListLimit,
  DraftsListSettings,
  DraftsListSorting,
  draftsListSortings,
} from "@/lib/posts/draftsListSettings";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PostsItem from "../PostsList/PostsItem";
import TextLinkButton from "../TextLinkButton";
import InlineSelect from "../Forms/InlineSelect";
import Checkbox from "../Forms/Checkbox";
import Loading from "../Loading";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

const sortOptions = (Object.keys(draftsListSortings) as DraftsListSorting[]).map(
  (value) => ({ value, label: draftsListSortings[value] }),
);

export default function DraftsList({
  initialPosts,
  settings,
}: Readonly<{
  initialPosts: PostListItem[];
  settings: DraftsListSettings;
}>) {
  const { captureEvent } = useTracking();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(
    initialPosts.length >= draftsListLimit,
  );

  const onUpdateSettings = useCallback(
    (update: Partial<DraftsListSettings>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(update)) {
        params.set(key, String(value));
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
      captureEvent("draftsListSettingsUpdate", update);
      rpc.users
        .updateDraftsListSettings({ ...settings, ...update })
        .catch(captureException);
    },
    [captureEvent, pathname, router, searchParams, settings],
  );

  const onLoadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rpc.posts.listDrafts({
        settings,
        offset: posts.length,
        limit: draftsListLimit,
      });
      setPosts((posts) => [...posts, ...data]);
      setCanLoadMore(data.length >= draftsListLimit);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      captureException(e);
    } finally {
      setLoading(false);
    }
  }, [settings, posts.length]);

  const setPostArchived = useCallback((postId: string, archived: boolean) => {
    setPosts((posts) =>
      posts.map((post) =>
        post._id === postId ? { ...post, deletedDraft: archived } : post,
      ),
    );
  }, []);

  return (
    <section data-component="DraftsList" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Type style="postsPageTitle">Drafts & unpublished posts</Type>
        <Type>
          <Link href="/newPost" className="text-primary hover:opacity-70">
            New post
          </Link>
        </Type>
      </div>
      <div className="flex items-center justify-between gap-x-6 gap-y-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Type style="bodyMedium" className="text-gray-600">
            Sorted by{" "}
            <InlineSelect
              value={settings.sortDraftsBy}
              setValue={(sortDraftsBy) => onUpdateSettings({ sortDraftsBy })}
              options={sortOptions}
            />
          </Type>
          {isPending && <Loading />}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Tooltip
            title={
              <Type style="bodySmall">
                <div>By default, archived posts are hidden.</div>
                <div>Toggle to show them.</div>
              </Type>
            }
          >
            <Checkbox
              label={{ id: "includeArchived", text: "Show archived" }}
              checked={settings.includeArchived}
              onChange={(includeArchived) => onUpdateSettings({ includeArchived })}
              className="text-gray-600"
            />
          </Tooltip>
          <Tooltip
            title={
              <Type style="bodySmall">
                <div>By default, posts shared with you are shown.</div>
                <div>Toggle to hide them.</div>
              </Type>
            }
          >
            <Checkbox
              label={{ id: "includeShared", text: "Show shared with you" }}
              checked={settings.includeShared}
              onChange={(includeShared) => onUpdateSettings({ includeShared })}
              className="text-gray-600"
            />
          </Tooltip>
        </div>
      </div>
      {posts.length === 0 ? (
        <Type className="text-gray-600">No drafts to display</Type>
      ) : (
        <div className="max-w-full space-y-0.5">
          {posts.map((post) => (
            <PostsItem
              key={post._id}
              post={post}
              onArchivedChange={(archived) => setPostArchived(post._id, archived)}
            />
          ))}
        </div>
      )}
      {loading && <PostsListSkeleton count={5} />}
      {canLoadMore && !loading && (
        <TextLinkButton variant="primary" onClick={onLoadMore}>
          Load more
        </TextLinkButton>
      )}
    </section>
  );
}
