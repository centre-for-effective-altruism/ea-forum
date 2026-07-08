"use client";

import { useState, ChangeEvent, useEffect, useCallback, useRef, FC } from "react";
import type {
  SearchDocument,
  SearchPost,
  SearchSequence,
} from "@/lib/search/searchDocuments";
import { getSearchClient } from "@/lib/search/searchClient";
import clsx from "clsx";
import MagnifyingGlassIcon from "@heroicons/react/16/solid/MagnifyingGlassIcon";
import Dropdown, { DropdownDismissRef } from "../Dropdown/Dropdown";
import Type, { typeStyles } from "../Type";
import Loading from "../Loading";
import Input from "./Input";

const PostResult: FC<{ post: SearchPost }> = ({ post }) => (
  <>
    <span className="truncate">{post.title}</span>
    <span className="text-gray-600">({post.authorDisplayName})</span>
  </>
);

const SequenceResult: FC<{ sequence: SearchSequence }> = ({ sequence }) => (
  <>
    <span className="truncate">{sequence.title}</span>
    <span className="text-gray-600">({sequence.authorDisplayName})</span>
  </>
);

export default function DocumentSelect({
  value,
  setValue,
  label,
  index,
}: Readonly<{
  value: string;
  setValue: (_id: string) => void;
  label?: string;
  index: "posts" | "sequences";
}>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchDocument[] | null>(null);
  const dismissRef: DropdownDismissRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (query) {
      void (async () => {
        const requestId = ++requestIdRef.current;
        const results = await getSearchClient().search<SearchDocument>([
          {
            indexName: index,
            query,
            params: {
              query,
              hitsPerPage: 6,
              page: 0,
            },
          },
        ]);
        if (requestIdRef.current === requestId) {
          setResults(results[0].hits ?? []);
        }
      })();
    } else {
      setResults(null);
    }
  }, [index, query]);

  const onChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  }, []);

  const onSelect = useCallback(
    (_id: string) => {
      dismissRef.current?.();
      setValue(_id);
      setQuery("");
    },
    [setValue],
  );

  const docsToDisplay = query.length ? results : [];
  return (
    <Dropdown
      menu={
        <div
          className="
            bg-surface-floating border-1 border-gray-100 rounded shadow-md py-1
            flex flex-col gap-1 w-[400px] max-w-full
          "
        >
          <div className="flex gap-1 px-2 w-full">
            <input
              value={query}
              onChange={onChange}
              placeholder="Search..."
              className={clsx(typeStyles.bodySmall, "outline-none grow")}
            />
            <MagnifyingGlassIcon className="w-3" />
          </div>
          <div className="my-1 px-2 flex flex-col gap-2 items-start">
            {docsToDisplay === null && <Loading />}
            {docsToDisplay && docsToDisplay.length === 0 && (
              <Type style="bodySmall" className="text-gray-600">
                No results found
              </Type>
            )}
            {docsToDisplay?.map((doc) => (
              <Type
                key={doc._id}
                onClick={onSelect.bind(null, doc._id)}
                As="button"
                style="bodySmall"
                className="
                  cursor-pointer w-full text-left text-gray-900 hover:text-primary
                  flex items-center gap-1
                "
              >
                {doc._index === "posts" && <PostResult post={doc} />}
                {doc._index === "sequences" && <SequenceResult sequence={doc} />}
              </Type>
            ))}
          </div>
        </div>
      }
      placement="bottom-start"
      dismissRef={dismissRef}
    >
      <Input value={value} setValue={setValue} label={label} />
    </Dropdown>
  );
}
