import PeopleDirectorySkeletonTextCell from "./PeopleDirectorySkeletonTextCell";

export default function PeopleDirectorySkeletonUserCell() {
  return (
    <div
      data-componen="PeopleDirectorySkeletonUserCell"
      className="flex items-center gap-2 w-full"
    >
      <div
        className={`
          rounded-full min-w-8 w-8 h-8
          bg-linear-to-r from-gray-300 to-gray-200
        `}
      />
      <PeopleDirectorySkeletonTextCell />
    </div>
  );
}
