import { formatShortDate } from "@/lib/timeUtils";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";
import Link from "../../Link";
import Type from "../../Type";

export default function HomeSidebarCourse({
  title,
  href,
  applicationDeadline,
  startDate,
}: Readonly<{
  title: string;
  href: string;
  applicationDeadline: Date;
  startDate: Date;
}>) {
  return (
    <Link
      href={href}
      className="block px-2 py-1 -mx-2 rounded hover:bg-gray-100"
      data-component="HomeSidebarPost"
    >
      <Type style="bodySmall" className="font-[600] truncate flex flex-row gap-1">
        <ComputerDesktopIcon className="w-[16px]" /> {title}
      </Type>
      <Type style="bodySmall" className="text-gray-600">
        Apply by {formatShortDate(applicationDeadline)}, starting{" "}
        {formatShortDate(startDate)}
      </Type>
    </Link>
  );
}
