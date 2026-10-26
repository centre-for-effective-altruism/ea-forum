import clsx from "clsx";

export default function NewQuickTakeSkeleton({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      aria-hidden
      data-component="NewQuickTakeSkeleton"
      className={clsx("bg-gray-0 border border-gray-200 p-3 rounded", className)}
    >
      <div className="flex items-center h-10 bg-gray-100 rounded p-2">
        <div className="h-3 w-80 max-w-full bg-gray-200 rounded" />
      </div>
    </div>
  );
}
