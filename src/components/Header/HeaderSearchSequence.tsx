import type { SearchSequence } from "@/lib/search/searchDocuments";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import BookOpenIcon from "@heroicons/react/24/solid/BookOpenIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import TimeAgo from "../TimeAgo";
import Type from "../Type";

export default function HeaderSearchSequence({
  sequence,
}: Readonly<{
  sequence: SearchSequence;
}>) {
  return (
    <HeaderSearchResult
      tooltipTitle="Sequence"
      href={sequenceGetPageUrl({ sequence })}
      Icon={BookOpenIcon}
    >
      <div className="flex items-center gap-2">
        <Type style="postTitle">{sequence.title}</Type>
        <span>{sequence.authorDisplayName}</span>
        <TimeAgo textStyle="bodySmall" As="span" time={sequence.createdAt} />
      </div>
    </HeaderSearchResult>
  );
}
