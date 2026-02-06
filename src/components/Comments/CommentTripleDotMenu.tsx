import { useCallback, useState } from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/solid/EllipsisVerticalIcon";
import ReportPopover from "../Moderation/ReportPopover";
import DropdownMenu from "../Dropdown/DropdownMenu";

export default function CommentTripleDotMenu({
  comment,
}: Readonly<{
  comment: CommentsList;
}>) {
  const [reportOpen, setReportOpen] = useState(false);
  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);
  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        className="text-gray-900"
        items={[
          {
            title: "Report",
            Icon: ExclamationCircleIcon,
            onClick: openReport,
          },
        ]}
      >
        <button
          aria-label="Comment options"
          className="
            text-gray-600 hover:text-gray-900 cursor-pointer flex items-center]
          "
        >
          <EllipsisVerticalIcon className="w-5 text-gray-600 hover:text-gray-1000" />
        </button>
      </DropdownMenu>
      <ReportPopover comment={comment} open={reportOpen} onClose={closeReport} />
    </>
  );
}
