"use client";

import { useCallback, useState } from "react";
import FunnelIcon from "@heroicons/react/24/outline/FunnelIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { useSearchPage } from "./useSearchPage";
import SearchPageFilters from "./SearchPageFilters";
import Popover from "../../Popover";

export default function SearchPageMobileFilters() {
  const { hasFilters } = useSearchPage();
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <div data-component="SearchPageMobileFilters" className="md:hidden">
      <button
        type="button"
        aria-label="Filters"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="
          relative cursor-pointer flex items-center justify-center w-12 h-12
          rounded border border-gray-300 text-gray-600 hover:text-gray-1000
        "
      >
        <FunnelIcon className="w-5" />
        {hasFilters && (
          <span
            aria-hidden
            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
          />
        )}
      </button>
      <Popover
        open={open}
        onClose={onClose}
        className="relative w-[360px] max-w-[calc(100vw-32px)] p-6"
        noPadding
      >
        <button
          type="button"
          aria-label="Close filters"
          onClick={onClose}
          className="
            absolute top-5 right-5 cursor-pointer text-gray-600 hover:text-gray-1000
          "
        >
          <XMarkIcon className="w-5" />
        </button>
        <SearchPageFilters />
      </Popover>
    </div>
  );
}
