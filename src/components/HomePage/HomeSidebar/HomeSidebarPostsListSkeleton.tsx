export default function HomeSidebarPostsListSkeleton({
  count,
}: Readonly<{
  count: number;
}>) {
  return (
    <div
      data-component="HomeSidebarPostsListSkeleton"
      className="flex flex-col gap-2"
    >
      {new Array(count).fill(null).map((_, i) => (
        <div className="flex flex-col gap-1" key={i}>
          <div className="w-full h-[16px] bg-gray-300" />
          <div className="w-[40%] h-[16px] bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
