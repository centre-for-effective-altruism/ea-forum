import type { SearchSequence } from "@/lib/search/searchDocuments";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import BookOpenIcon from "@heroicons/react/24/outline/BookOpenIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import TimeAgo from "../TimeAgo";
import Type from "../Type";

export default function HeaderSearchSequence({
  sequence,
  selected,
}: Readonly<{
  sequence: SearchSequence;
  selected?: boolean;
}>) {
  return (
    <HeaderSearchResult
      selected={selected}
      href={sequenceGetPageUrl({ sequence })}
      Icon={BookOpenIcon}
    >
      <div className="flex items-center gap-2">
        <Type style="postTitle" className="text-gray-800">
          {sequence.title}
        </Type>
        <span>{sequence.authorDisplayName}</span>
        <TimeAgo textStyle="bodySmall" As="span" time={sequence.createdAt} />
      </div>
    </HeaderSearchResult>
  );
}
