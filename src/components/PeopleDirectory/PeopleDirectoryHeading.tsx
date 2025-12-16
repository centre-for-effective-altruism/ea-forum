import { useCallback } from "react";
import ChevronUpDownIcon from "@heroicons/react/16/solid/ChevronUpDownIcon";
import type { PeopleDirectoryColumn } from "./peopleDirectoryColumns";
import { usePeopleDirectory } from "./usePeopleDirectory";
import Type from "../Type";

export default function PeopleDirectoryHeading({
  column,
}: Readonly<{
  column: PeopleDirectoryColumn;
}>) {
  const { sorting, setSorting } = usePeopleDirectory();

  const onToggleSort = useCallback(() => {
    const firstSort = column.defaultSort ?? "asc";
    const secondSort = firstSort === "asc" ? "desc" : "asc";
    if (!column.sortField) {
      return;
    } else if (sorting?.field === column.sortField) {
      if (sorting.direction === firstSort) {
        setSorting({
          field: column.sortField,
          direction: secondSort,
        });
      } else {
        setSorting(null);
      }
    } else {
      setSorting({
        field: column.sortField,
        direction: firstSort,
      });
    }
  }, [sorting, setSorting, column.sortField, column.defaultSort]);

  const isCurrentSort = column.sortField && sorting?.field === column.sortField;
  return (
    <Type
      data-component="PeopleDirectoryHeading"
      className={`
        flex items-center font-[600] py-2 px-[10px] whitespace-nowrap
        ${isCurrentSort ? "text-grey-1000" : "text-gray-600"}
      `}
    >
      {column.shortLabel ?? column.label}
      {column.sortField && (
        <ChevronUpDownIcon
          onClick={onToggleSort}
          className="w-4 cursor-pointer"
          role="button"
        />
      )}
    </Type>
  );
}
