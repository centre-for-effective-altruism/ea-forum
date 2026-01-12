"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSearchClient } from "@/lib/search/searchClient";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import HeaderSearchUser from "./HeaderSearchUser";
import HeaderSearchPost from "./HeaderSearchPost";
import HeaderSearchTag from "./HeaderSearchTag";
import HeaderSearchComment from "./HeaderSearchComment";
import HeaderSearchSequence from "./HeaderSearchSequence";
import Loading from "../Loading";
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
  const client = getSearchClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Partial<HeaderSearchResults>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef(0);

  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const query = ev.target.value;
      setQuery(query);
      setResults({});
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
            const hits = response.results[i].hits;
            if (hits.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              results[index] = hits as any;
            }
          }
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

  return (
    <div data-component="HeaderSearch" className="flex gap-2 items-center">
      <MagnifyingGlassIcon className="w-[24px] text-gray-600" />
      <input
        value={query}
        onChange={onChange}
        ref={inputRef}
        placeholder="Search here..."
        className="w-[220px] outline-none font-sans text-[14px]"
      />
      <button
        onClick={onClose}
        className="cursor-pointer p-2 rounded-full hover:bg-gray-100"
      >
        <XMarkIcon className="w-[16px]" />
      </button>
      {query && (
        <div
          className="
            absolute top-[66px] right-0 w-[440px] max-w-full bg-gray-0 shadow-md
          "
        >
          {hasResults ? (
            <div
              className="
                  flex flex-col gap-[1px] bg-gray-300 overflow-auto
                  max-h-[calc(100vh-66px)] [&>*]:bg-gray-0 [&>*]:p-2
                "
            >
              <div>
                {results.users?.map((user) => (
                  <HeaderSearchUser user={user} key={user._id} />
                ))}
              </div>
              <div>
                {results.posts?.map((post) => (
                  <HeaderSearchPost post={post} key={post._id} />
                ))}
              </div>
              <div>
                {results.tags?.map((tag) => (
                  <HeaderSearchTag tag={tag} key={tag._id} />
                ))}
              </div>
              <div>
                {results.comments?.map((comment) => (
                  <HeaderSearchComment comment={comment} key={comment._id} />
                ))}
              </div>
              <div>
                {results.sequences?.map((sequence) => (
                  <HeaderSearchSequence sequence={sequence} key={sequence._id} />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <Loading />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
