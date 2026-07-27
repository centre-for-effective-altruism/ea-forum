export default function FeaturedPostSkeleton({
  large,
}: Readonly<{
  large?: boolean;
}>) {
  return (
    <div
      data-component="FeaturedPostSkeleton"
      className="
        h-full bg-gray-200 border-1 border-gray-100
        rounded p-5 flex flex-col gap-3
      "
    >
      <div className="bg-gray-300 h-[150px] rounded grow" />
      <div className="flex flex-col gap-1">
        {large ? (
          <>
            <div className="bg-gray-400 h-[30px] rounded" />
            <div className="bg-gray-400 h-[30px] rounded" />
            <div className="bg-gray-400 h-[30px] rounded" />
          </>
        ) : (
          <>
            <div className="bg-gray-400 h-[25px] rounded" />
            <div className="bg-gray-400 h-[25px] rounded" />
          </>
        )}
      </div>
      <div className="bg-gray-300 h-[20px] rounded" />
    </div>
  );
}
