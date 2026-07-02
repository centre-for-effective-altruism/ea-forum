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
import type { SearchPost, SearchSequence } from "@/lib/search/searchDocuments";
import type { SpotlightDocumentType } from "@/lib/spotlights/spotlightHelpers";
import { getSearchClient } from "@/lib/search/searchClient";
import clsx from "clsx";
import MagnifyingGlassIcon from "@heroicons/react/16/solid/MagnifyingGlassIcon";
import Type, { typeStyles } from "@/components/Type";
import Dropdown, { DropdownDismissRef } from "@/components/Dropdown/Dropdown";
import Loading from "@/components/Loading";

export type SelectedDocument = {
  _id: string;
  title: string;
};

/**
 * Search picker for the post or sequence that a spotlight links to.
 * Follows the same search-and-select pattern as `TagSelect`.
 */
export default function DocumentSelect({
  documentType,
  onSelect,
  placement,
  dismissRef,
  children,
}: Readonly<{
  documentType: SpotlightDocumentType;
  onSelect: (document: SelectedDocument) => void;
  placement?: Placement;
  dismissRef?: DropdownDismissRef;
  children: ReactNode;
}>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(SearchPost | SearchSequence)[] | null>(
    null,
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (query) {
      void (async () => {
        const requestId = ++requestIdRef.current;
        const searchResults = await getSearchClient().search<
          SearchPost | SearchSequence
        >([
          {
            indexName: documentType === "Post" ? "posts" : "sequences",
            query,
            params: {
              query,
              hitsPerPage: 8,
              page: 0,
            },
          },
        ]);
        if (requestIdRef.current === requestId) {
          setResults(searchResults[0].hits ?? []);
        }
      })();
    } else {
      setResults(null);
    }
  }, [query, documentType]);

  const onChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  }, []);

  return (
    <Dropdown
      menu={
        <div
          className="
            bg-surface-floating border-1 border-gray-100 rounded shadow-md py-1
            flex flex-col gap-1 w-[320px] max-w-full
          "
        >
          <div className="flex gap-1 px-2 w-full">
            <input
              value={query}
              onChange={onChange}
              placeholder={`Search ${documentType === "Post" ? "posts" : "sequences"}...`}
              className={clsx(typeStyles.bodySmall, "outline-none grow")}
            />
            <MagnifyingGlassIcon className="w-3" />
          </div>
          <div className="my-1 px-2 flex flex-col gap-2 items-start">
            {query.length > 0 && results === null && <Loading />}
            {results && results.length === 0 && (
              <Type style="bodySmall" className="text-gray-600">
                No results found
              </Type>
            )}
            {results?.map((result) => (
              <Type
                key={result._id}
                onClick={onSelect.bind(null, {
                  _id: result._id,
                  title: result.title ?? "Untitled",
                })}
                As="button"
                style="bodySmall"
                className="
                  cursor-pointer w-full text-left text-gray-900 hover:text-primary
                "
              >
                <span className="line-clamp-1">
                  {result.title ?? "Untitled"}
                  {result.authorDisplayName && (
                    <span className="text-gray-600">
                      {" "}
                      · {result.authorDisplayName}
                    </span>
                  )}
                </span>
              </Type>
            ))}
          </div>
        </div>
      }
      placement={placement}
      dismissRef={dismissRef}
    >
      {children}
    </Dropdown>
  );
}
