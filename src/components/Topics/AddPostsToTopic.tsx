"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import type { SearchPost } from "@/lib/search/searchDocuments";
import { getSearchClient } from "@/lib/search/searchClient";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import toast from "react-hot-toast";
import debounce from "lodash/debounce";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import MagnifyingGlassIcon from "@heroicons/react/16/solid/MagnifyingGlassIcon";
import Type, { typeStyles } from "../Type";
import Loading from "../Loading";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; hits: SearchPost[] };

export default function AddPostsToTopic({
  tag,
}: Readonly<{ tag: { _id: string; name: string } }>) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [addingPostId, setAddingPostId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useMemo(
    () =>
      debounce(async (query: string, tagId: string) => {
        const requestId = ++requestIdRef.current;
        try {
          const results = await getSearchClient().search<SearchPost>([
            {
              indexName: "posts",
              query,
              params: {
                query,
                hitsPerPage: 10,
                page: 0,
                facetFilters: [[`tags._id:-${tagId}`]],
              },
            },
          ]);
          if (requestIdRef.current === requestId) {
            setSearch({ status: "success", hits: results[0]?.hits ?? [] });
          }
        } catch (e) {
          if (requestIdRef.current === requestId) {
            setSearch({ status: "error" });
          }
          captureException(e);
        }
      }, 300),
    [],
  );

  useEffect(() => () => runSearch.cancel(), [runSearch]);

  useEffect(() => {
    if (query) {
      setSearch({ status: "loading" });
      void runSearch(query, tag._id);
    } else {
      ++requestIdRef.current;
      runSearch.cancel();
      setSearch({ status: "idle" });
    }
  }, [query, tag._id, runSearch]);

  const onOpen = useCallback(() => {
    if (currentUser) {
      setOpen(true);
    } else {
      onSignup();
    }
  }, [currentUser, onSignup]);

  const onClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const onChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  }, []);

  const onSelect = useCallback(
    async (post: SearchPost) => {
      setAddingPostId(post._id);
      try {
        await rpc.tags.addOrUpvoteTag({ tagId: tag._id, postId: post._id });
        captureEvent("tagAddedToItem", { tagId: tag._id, tagName: tag.name });
        toast.success(`Tagged post with "${tag.name}"`);
        setSearch((search) =>
          search.status === "success"
            ? {
                status: "success",
                hits: search.hits.filter(({ _id }) => _id !== post._id),
              }
            : search,
        );
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error((e as Error).message ?? "Something went wrong");
        captureException(e);
      }
      setAddingPostId(null);
    },
    [tag._id, tag.name, captureEvent, router],
  );

  if (!open) {
    return (
      <Type
        As="button"
        style="bodyMedium"
        onClick={onOpen}
        className="
          cursor-pointer flex items-center gap-1 text-gray-600 hover:text-gray-1000
        "
      >
        <PlusIcon className="w-4" />
        Add posts
      </Type>
    );
  }

  return (
    <div
      data-component="AddPostsToTopic"
      className="w-full flex flex-col gap-2 p-2 rounded bg-gray-0 border border-gray-200"
    >
      <div className="flex items-center gap-2">
        <MagnifyingGlassIcon className="w-4 text-gray-600" />
        <input
          autoFocus
          value={query}
          onChange={onChange}
          placeholder="Search posts..."
          className={clsx(
            typeStyles.body,
            "grow outline-none bg-transparent text-gray-1000",
          )}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer text-gray-600 hover:text-gray-1000"
        >
          <XMarkIcon className="w-5" />
        </button>
      </div>
      {search.status === "loading" && <Loading />}
      {search.status === "error" && (
        <Type style="bodySmall" className="text-error">
          Failed to load search results
        </Type>
      )}
      {search.status === "success" && search.hits.length === 0 && (
        <Type style="bodySmall" className="text-gray-600">
          No results found
        </Type>
      )}
      {search.status === "success" && search.hits.length > 0 && (
        <div className="flex flex-col">
          {search.hits.map((post) => (
            <Type
              key={post._id}
              As="button"
              style="bodySmall"
              disabled={addingPostId !== null}
              onClick={() => void onSelect(post)}
              className={clsx(
                "w-full text-left px-1 py-1.5 rounded flex items-center gap-1",
                "text-gray-900 hover:bg-gray-100 hover:text-primary",
                addingPostId === null ? "cursor-pointer" : "cursor-wait opacity-60",
              )}
            >
              <span className="truncate">{post.title}</span>
              {post.authorDisplayName && (
                <span className="text-gray-600 whitespace-nowrap">
                  ({post.authorDisplayName})
                </span>
              )}
            </Type>
          ))}
        </div>
      )}
    </div>
  );
}
