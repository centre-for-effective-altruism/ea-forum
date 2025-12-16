import type { SearchUser } from "@/lib/search/searchDocuments";
import Tooltip from "../Tooltip";
import Type from "../Type";

export const EMPTY_TEXT_PLACEHOLDER = "–";

export default function PeopleDirectoryTextCell({
  user,
  fieldName,
}: Readonly<{
  user: SearchUser;
  fieldName: keyof SearchUser;
}>) {
  const text = String(user[fieldName] || "").trim() || EMPTY_TEXT_PLACEHOLDER;
  const isEmpty = text === EMPTY_TEXT_PLACEHOLDER;
  return (
    <Tooltip
      title={user[fieldName] ? <Type>{String(user[fieldName])}</Type> : undefined}
      tooltipClassName="max-w-[270px]"
    >
      <Type
        data-component="PeopleDirectoryTextCell"
        style="directoryCell"
        className={`line-clamp-2 ${isEmpty && "text-gray-600"}`}
      >
        {text}
      </Type>
    </Tooltip>
  );
}
