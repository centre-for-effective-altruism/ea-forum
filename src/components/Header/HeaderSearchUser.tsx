import type { SearchUser } from "@/lib/search/searchDocuments";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import HeaderSearchResult from "./HeaderSearchResult";
import UserProfileImage from "../UserProfileImage";
import TimeAgo from "../TimeAgo";

export default function HeaderSearchUser({
  user,
  selected,
}: Readonly<{
  user: SearchUser;
  selected?: boolean;
}>) {
  return (
    <HeaderSearchResult
      selected={selected}
      href={userGetProfileUrl({ user, from: "search_autocomplete" })}
      leading={
        <span className="flex items-center ml-1 mr-3">
          <UserProfileImage user={user} size={20} />
        </span>
      }
    >
      <div className="flex gap-2">
        <span>{user.displayName}</span>
        <TimeAgo textStyle="bodySmall" As="span" time={user.createdAt} />
        <span>{user.karma} karma</span>
      </div>
    </HeaderSearchResult>
  );
}
