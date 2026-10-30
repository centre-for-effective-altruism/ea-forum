import type { SearchUser } from "@/lib/search/searchDocuments";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import MapPinIcon from "@heroicons/react/24/outline/MapPinIcon";
import SearchSnippet from "./SearchSnippet";
import UserProfileImage from "../../UserProfileImage";
import TimeAgo from "../../TimeAgo";
import Link from "../../Link";
import Type from "../../Type";

export default function SearchUserHit({ hit }: Readonly<{ hit: SearchUser }>) {
  const profileUrl = userGetProfileUrl({ user: hit, from: "search_page" });
  const role = [hit.jobTitle, hit.organization].filter(Boolean).join(" @ ");
  return (
    <article
      data-component="SearchUserHit"
      className="flex gap-3 max-w-[720px] px-3 py-2 rounded hover:bg-gray-100"
    >
      <UserProfileImage user={hit} size={36} className="shrink-0" />
      <div className="flex flex-col gap-1 min-w-0">
        <Type style="postTitle" className="text-gray-1000">
          <Link href={profileUrl} className="hover:opacity-70">
            {hit.displayName}
          </Link>
        </Type>
        <Type
          style="bodySmall"
          className="flex flex-wrap items-center gap-x-2 text-gray-600"
        >
          <span className="flex items-center gap-1">
            Joined
            <TimeAgo
              textStyle="bodySmall"
              As="span"
              time={hit.createdAt}
              tooltipPrefix="Joined "
              includeAgo
            />
          </span>
          <span>{hit.karma ?? 0} karma</span>
          {hit.mapLocationAddress && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-4 shrink-0" />
              {hit.mapLocationAddress}
            </span>
          )}
        </Type>
        {role && (
          <Type style="bodySmall" className="text-gray-800">
            {role}
          </Type>
        )}
        <SearchSnippet hit={hit} field="bio" fallback={hit.bio} />
      </div>
    </article>
  );
}
