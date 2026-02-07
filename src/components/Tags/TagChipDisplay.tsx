import clsx from "clsx";
import Type from "../Type";
import Link from "../Link";

export type TagChipVariant = "core" | "default" | "postType" | "small";

export default function TagChipDisplay({
  name,
  href,
  core,
  variant,
}: Readonly<{
  name: string;
  href: string;
  core?: boolean;
  variant: TagChipVariant;
}>) {
  return (
    <Link
      href={href}
      className={clsx(
        "block select-none cursor-pointer border-1",
        variant === "small" ? "rounded-xs" : "rounded-sm",
        core
          ? "border-gray-100 bg-gray-100 hover:bg-gray-200"
          : "border-gray-200 hover:bg-gray-100",
      )}
    >
      <Type
        style={variant === "small" ? "bodyXSmall" : "postDescription"}
        className={clsx(
          "flex items-center whitespace-nowrap",
          variant === "postType" ? "text-gray-600" : "text-gray-1000",
          variant === "small" ? "h-[18px] p-[2px_6px]" : "h-[28px] p-[6px_8px]",
        )}
      >
        {name}
      </Type>
    </Link>
  );
}
