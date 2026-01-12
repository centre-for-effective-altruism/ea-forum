import clsx from "clsx";
import Type from "../Type";
import Link from "../Link";

export default function TagChipDisplay({
  name,
  href,
  variant,
}: Readonly<{
  name: string;
  href: string;
  variant: "core" | "default" | "postType";
}>) {
  return (
    <Link
      href={href}
      className={clsx(
        "block rounded-sm select-none cursor-pointer border-1",
        variant === "core"
          ? "border-gray-100 bg-gray-100 hover:bg-gray-200"
          : "border-gray-200 hover:bg-gray-100",
      )}
    >
      <Type
        style="postDescription"
        className={clsx(
          "h-[28px] p-[6px_8px] flex items-center whitespace-nowrap",
          variant === "postType" ? "text-gray-600" : "text-gray-1000",
        )}
      >
        {name}
      </Type>
    </Link>
  );
}
