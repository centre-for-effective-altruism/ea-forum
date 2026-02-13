"use client";

import {
  useState,
  ChangeEvent,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { Placement } from "@floating-ui/react";
import type { TagBase } from "@/lib/tags/tagQueries";
import type { SearchTag } from "@/lib/search/searchDocuments";
import { getSearchClient } from "@/lib/search/searchClient";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import MagnifyingGlassIcon from "@heroicons/react/16/solid/MagnifyingGlassIcon";
import Type, { typeStyles } from "../Type";
import Dropdown from "../Dropdown/Dropdown";
import TagTooltip from "./TagTooltip";
import Loading from "../Loading";
import Link from "../Link";

export default function TagSelect({
  onSelect,
  placement,
  children,
}: Readonly<{
  onSelect?: (tag: { _id: string; name: string; slug: string }) => void;
  placement?: Placement;
  children: ReactNode;
}>) {
  const [query, setQuery] = useState("");
  const [coreTags, setCoreTags] = useState<TagBase[] | null>(null);
  const [results, setResults] = useState<SearchTag[] | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    void (async () => {
      const coreTags = await rpc.tags.listCore({ limit: 6 });
      setCoreTags(coreTags);
    })();
  }, []);

  useEffect(() => {
    if (query) {
      void (async () => {
        const requestId = ++requestIdRef.current;
        const results = await getSearchClient().search<SearchTag>([
          {
            indexName: "tags",
            query,
            params: {
              query,
              hitsPerPage: 6,
              page: 0,
            },
          },
        ]);
        if (requestIdRef.current === requestId) {
          setResults(results.results[0].hits ?? []);
        }
      })();
    } else {
      setResults(null);
    }
  }, [query]);

  const onChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  }, []);

  const tagsToDisplay = query.length ? results : coreTags;
  return (
    <Dropdown
      menu={
        <div
          className="
            bg-gray-0 border-1 border-gray-100 rounded shadow py-1
            flex flex-col gap-1 w-[240px] max-w-full
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
            {tagsToDisplay === null && <Loading />}
            {tagsToDisplay && tagsToDisplay.length === 0 && (
              <Type style="bodySmall" className="text-gray-600">
                No results found
              </Type>
            )}
            {tagsToDisplay?.map((tag) => (
              <TagTooltip key={tag._id} tag={tag} placement="left-start">
                <Type
                  onClick={onSelect?.bind(null, {
                    _id: tag._id,
                    name: tag.name,
                    slug: tag.slug,
                  })}
                  As="button"
                  style="bodySmall"
                  className="
                    cursor-pointer w-full text-left text-gray-900 hover:text-primary
                  "
                >
                  {tag.name} <span className="text-gray-600">({tag.postCount})</span>
                </Type>
              </TagTooltip>
            ))}
          </div>
          <hr className="border-gray-100" />
          <Link href="/topics" className="text-gray-600 hover:text-gray-1000">
            <Type style="bodySmall" className="px-2">
              All topics
            </Type>
          </Link>
          <Link href="/topics/create" className="text-gray-600 hover:text-gray-1000">
            <Type style="bodySmall" className="px-2">
              Create topic
            </Type>
          </Link>
        </div>
      }
      placement={placement}
    >
      {children}
    </Dropdown>
  );
}
