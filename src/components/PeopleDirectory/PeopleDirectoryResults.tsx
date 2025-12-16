"use client";

import { usePeopleDirectory } from "./usePeopleDirectory";
import PeopleDirectoryResultsList from "./PeopleDirectoryResultsList";
import PeopleDirectoryResultsMap from "./PeopleDirectoryResultsMap";

export default function PeopleDirectoryResults() {
  const { view } = usePeopleDirectory();
  return view === "list" ? (
    <PeopleDirectoryResultsList />
  ) : (
    <PeopleDirectoryResultsMap />
  );
}
