"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { getSearchClient } from "@/lib/search/searchClient";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import HeaderSearchUser from "./HeaderSearchUser";
import HeaderSearchPost from "./HeaderSearchPost";
import HeaderSearchTag from "./HeaderSearchTag";
import HeaderSearchComment from "./HeaderSearchComment";
import HeaderSearchSequence from "./HeaderSearchSequence";
import Loading from "../Loading";
import Type from "../Type";
import Link from "../Link";
import type {
  SearchComment,
  SearchPost,
  SearchSequence,
  SearchTag,
  SearchUser,
} from "@/lib/search/searchDocuments";

const indexes = ["users", "posts", "tags", "comments", "sequences"] as const;

type HeaderSearchResults = {
  users: SearchUser[];
  posts: SearchPost[];
  tags: SearchTag[];
  comments: SearchComment[];
  sequences: SearchSequence[];
};

export default function HeaderSearch({
  onClose,
}: Readonly<{
  onClose: () => void;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const client = getSearchClient();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Partial<HeaderSearchResults>>({});
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef(0);

  useEffect(() => {
    setQuery("");
    setSelectedIndex(-1);
  }, [pathname]);

  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const query = ev.target.value;
      setLoading(true);
      setQuery(query);
      setResults({});
      setSelectedIndex(-1);
      const requestId = ++responseRef.current;
      void (async () => {
        const response = await client.search(
          indexes.map((indexName) => ({
            indexName,
            query,
            params: {
              query,
              hitsPerPage: 3,
              page: 0,
            },
          })),
        );
        if (requestId === responseRef.current) {
          const results: Partial<HeaderSearchResults> = {};
          for (let i = 0; i < indexes.length; i++) {
            const index = indexes[i];
            const hits = response[i].hits;
            if (hits.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              results[index] = hits as any;
            }
          }
          setLoading(false);
          setResults(results);
        }
      })();
    },
    [client],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasResults = !!Object.values(results).flat().length;

  // Indices match the DOM order of the result anchors (users, posts, tags,
  // comments, sequences) followed by the "See all results" link.
  const userCount = results.users?.length ?? 0;
  const postCount = results.posts?.length ?? 0;
  const tagCount = results.tags?.length ?? 0;
  const commentCount = results.comments?.length ?? 0;
  const sequenceCount = results.sequences?.length ?? 0;
  const postsStart = userCount;
  const tagsStart = postsStart + postCount;
  const commentsStart = tagsStart + tagCount;
  const sequencesStart = commentsStart + commentCount;
  const seeAllIndex = sequencesStart + sequenceCount;

  // Keyboard navigation reuses the rendered result anchors (in DOM order) so
  // the per-result URL logic stays encapsulated in each result component.
  const resultAnchorAt = useCallback(
    (index: number) => resultsRef.current?.querySelectorAll("a")[index],
    [],
  );

  // Keep the highlighted result scrolled into view as it moves.
  useEffect(() => {
    if (selectedIndex < 0) {
      return;
    }
    resultAnchorAt(selectedIndex)?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, resultAnchorAt]);

  const onKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Escape") {
        onClose();
        return;
      }
      if (!query) {
        return;
      }
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        if (hasResults) {
          setSelectedIndex((i) => Math.min(i + 1, seeAllIndex));
        }
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        if (hasResults && selectedIndex >= 0) {
          resultAnchorAt(selectedIndex)?.click();
        } else {
          router.push(`/search?query=${encodeURIComponent(query)}`);
        }
        onClose();
      }
    },
    [query, hasResults, selectedIndex, seeAllIndex, router, onClose, resultAnchorAt],
  );

  return (
    <div data-component="HeaderSearch" className="flex gap-2 items-center">
      <MagnifyingGlassIcon className="w-[24px] text-gray-600" />
      <input
        value={query}
        onChange={onChange}
        onKeyDown={onKeyDown}
        ref={inputRef}
        placeholder="Search here..."
        className="
          w-[100px] sm:w-[160px] md:w-[220px] outline-none font-sans text-[14px]
        "
      />
      <button
        onClick={onClose}
        className="cursor-pointer p-2 rounded hover:bg-item-hover"
      >
        <XMarkIcon className="w-[20px] text-gray-600" />
      </button>
      {query && (
        <div
          className="
            absolute top-[66px] right-0 w-[440px] max-w-full bg-surface-floating shadow
          "
        >
          {loading && (
            <div className="w-full flex justify-center py-6">
              <Loading />
            </div>
          )}
          {hasResults && !loading && (
            <div
              ref={resultsRef}
              className="
                flex flex-col gap-[1px] bg-gray-300 overflow-auto overscroll-contain
                max-h-[calc(100vh-66px)] [&>*]:bg-surface-floating [&>*]:p-2
              "
            >
              {results.users && results.users.length > 0 && (
                <div>
                  {results.users.map((user, i) => (
                    <HeaderSearchUser
                      user={user}
                      key={user._id}
                      selected={selectedIndex === i}
                    />
                  ))}
                </div>
              )}
              {results.posts && results.posts.length > 0 && (
                <div>
                  {results.posts.map((post, i) => (
                    <HeaderSearchPost
                      post={post}
                      key={post._id}
                      selected={selectedIndex === postsStart + i}
                    />
                  ))}
                </div>
              )}
              {results.tags && results.tags.length > 0 && (
                <div>
                  {results.tags.map((tag, i) => (
                    <HeaderSearchTag
                      tag={tag}
                      key={tag._id}
                      selected={selectedIndex === tagsStart + i}
                    />
                  ))}
                </div>
              )}
              {results.comments && results.comments.length > 0 && (
                <div>
                  {results.comments.map((comment, i) => (
                    <HeaderSearchComment
                      comment={comment}
                      key={comment._id}
                      selected={selectedIndex === commentsStart + i}
                    />
                  ))}
                </div>
              )}
              {results.sequences && results.sequences.length > 0 && (
                <div>
                  {results.sequences.map((sequence, i) => (
                    <HeaderSearchSequence
                      sequence={sequence}
                      key={sequence._id}
                      selected={selectedIndex === sequencesStart + i}
                    />
                  ))}
                </div>
              )}
              <Type
                style="bodyMedium"
                className={clsx(
                  "flex justify-center rounded",
                  selectedIndex === seeAllIndex && "bg-surface-floating-hover",
                )}
              >
                <Link
                  href={`/search?query=${encodeURIComponent(query)}`}
                  className="text-primary font-[600] hover:opacity-60"
                >
                  See all results
                </Link>
              </Type>
            </div>
          )}
          {!hasResults && !loading && (
            <div className="w-full flex justify-center py-6">
              <Type style="sectionTitleSmall">No results</Type>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
