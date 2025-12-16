export default function PeopleDirectorySkeletonTextCell({
  lines = 1,
}: Readonly<{
  lines?: number;
}>) {
  return (
    <div
      data-component="PeopleDirectorySkeletonTextCell"
      className="flex flex-col gap-2 w-full"
    >
      {Array.from(Array(lines).keys()).map((i) => (
        <div
          key={i}
          className={`
            rounded-xs max-w-full w-[136px] h-2
            bg-linear-to-r from-gray-300 to-gray-200
          `}
        />
      ))}
    </div>
  );
}
