import type { FC } from "react";
import type { SearchUser } from "@/lib/search/searchDocuments";
import {
  cellComponentsByName,
  PeopleDirectoryColumn,
} from "./peopleDirectoryColumns";

export default function PeopleDirectoryCell({
  result,
  column,
}: Readonly<{
  result?: SearchUser;
  column: PeopleDirectoryColumn;
}>) {
  if (column.hideable && column.hidden) {
    return null;
  }
  const {
    componentName,
    props,
    skeletonComponentName = "PeopleDirectorySkeletonTextCell",
    skeletonProps,
  } = column;
  const Component = cellComponentsByName[componentName] as FC<{ user?: SearchUser }>;
  const Skeleton = cellComponentsByName[skeletonComponentName] as FC;
  return (
    <div
      data-component="PeopleDirectoryCell"
      className={`
        flex items-center h-16 px-[10px] py-3 border-t border-gray-300
        bg-(--people-directory-row-bg)
      `}
    >
      {result ? (
        <Component user={result} {...props} />
      ) : (
        <Skeleton {...skeletonProps} />
      )}
    </div>
  );
}
