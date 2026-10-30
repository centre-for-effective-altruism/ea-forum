"use client";

import { ChangeEvent, useCallback } from "react";
import { useSearchPage } from "./useSearchPage";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import InformationCircleIcon from "@heroicons/react/24/outline/InformationCircleIcon";
import Tooltip from "../../Tooltip";
import Type from "../../Type";

export default function SearchPageInput() {
  const { inputQuery, setInputQuery } = useSearchPage();

  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => setInputQuery(ev.target.value),
    [setInputQuery],
  );

  return (
    <div
      data-component="SearchPageInput"
      className="
        flex items-center grow h-12 rounded bg-gray-50 text-gray-1000
        border border-gray-300 focus-within:border-gray-600
      "
    >
      <MagnifyingGlassIcon className="w-5 ml-4 text-gray-600 shrink-0" />
      <input
        type="search"
        aria-label="Search"
        placeholder="Search"
        value={inputQuery}
        onChange={onChange}
        autoFocus
        className="w-full bg-transparent p-3 text-[16px] font-[500] outline-none"
      />
      <Tooltip
        className="max-md:hidden mr-4 text-gray-600 hover:text-gray-1000"
        title={
          <Type style="bodySmall" className="max-w-[300px]">
            &quot;Quotes&quot; and -minus signs are supported. Use user:&quot;Jane
            Doe&quot; or topic:&quot;Expected value&quot; to filter by user or topic.
          </Type>
        }
      >
        <InformationCircleIcon className="w-5" aria-label="Search syntax help" />
      </Tooltip>
    </div>
  );
}
