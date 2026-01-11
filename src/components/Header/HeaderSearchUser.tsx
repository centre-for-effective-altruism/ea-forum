import type { SearchUser } from "@/lib/search/searchDocuments";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import UserIcon from "@heroicons/react/24/solid/UserIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import TimeAgo from "../TimeAgo";

export default function HeaderSearchUser({
  user,
}: Readonly<{
  user: SearchUser;
}>) {
  return (
    <HeaderSearchResult
      tooltipTitle="User"
      href={userGetProfileUrl({ user, from: "search_autocomplete" })}
      Icon={UserIcon}
    >
      <div className="flex gap-2">
        <span>{user.displayName}</span>
        <TimeAgo textStyle="bodySmall" As="span" time={user.createdAt} />
        <span>{user.karma} karma</span>
      </div>
    </HeaderSearchResult>
  );
}
