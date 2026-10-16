import { formatThousands } from "@/lib/formatHelpers";
import Type from "../Type";
import clsx from "clsx";

export default function UserProfileHeading({
  count,
  className,
  children,
}: Readonly<{
  count?: number;
  className?: string;
  children: string;
}>) {
  return (
    <Type
      style="sectionTitleLarge"
      className={clsx(
        "inline-flex items-baseline gap-1.5 border-b-3 border-primary pb-[3px]",
        className,
      )}
    >
      {children}
      {typeof count === "number" && (
        <Type style="bodyMedium" className="text-gray-600">
          {formatThousands(count)}
        </Type>
      )}
    </Type>
  );
}
