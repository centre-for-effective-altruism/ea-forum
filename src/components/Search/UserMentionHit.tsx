import type { SearchUser } from "@/lib/search/searchDocuments";
import { formatRelativeTime } from "@/lib/timeUtils";
import UserIcon from "@heroicons/react/24/outline/UserIcon";
import Type from "../Type";

export default function UserMentionHit({ hit }: Readonly<{ hit: SearchUser }>) {
  return (
    <article data-component="UserMentionHit" className="flex items-center gap-2">
      <UserIcon className="w-4" />
      <Type style="bodySmall">{hit.displayName}</Type>
      <Type style="bodySmall" className="text-gray-600">
        {formatRelativeTime(hit.createdAt, { style: "short" })}
      </Type>
      <Type style="bodySmall" className="text-gray-600">
        {hit.karma ?? 0} karma
      </Type>
    </article>
  );
}
