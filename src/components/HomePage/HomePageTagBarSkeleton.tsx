import clsx from "clsx";

export default function HomePageTabBarSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <section
      className={clsx("w-full max-w-full h-[29px] rounded bg-gray-200", className)}
      data-component="HomePageTabBarSkeleton"
    />
  );
}
