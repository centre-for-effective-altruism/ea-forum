"use client";

import { usePeopleDirectory } from "./usePeopleDirectory";
import PeopleDirectoryInput from "./PeopleDirectoryInput";
import MagnifyingGlassIcon from "@heroicons/react/24/solid/MagnifyingGlassIcon";

export default function PeopleDirectoryMainSearch() {
  const { query, setQuery } = usePeopleDirectory();
  return (
    <PeopleDirectoryInput
      value={query}
      setValue={setQuery}
      Icon={MagnifyingGlassIcon}
      placeholder="Search name or bio..."
      data-component="PeopleDirectoryMainSearch"
    />
  );
}
