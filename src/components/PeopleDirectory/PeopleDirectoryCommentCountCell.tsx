import type { SearchUser } from "@/lib/search/searchDocuments";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import Link from "../Link";
import Type from "../Type";

export default function PeopleDirectoryCommentCountCell({
  user,
}: Readonly<{
  user: SearchUser;
}>) {
  const url = userGetProfileUrl({ user }) + "#contributions";
  return (
    <Type style="directoryCell" data-component="PeopleDirectoryCommentCountCell">
      <Link
        href={url}
        openInNewTab
        className="text-[14px] text-(--color-primary) whitespace-nowrap"
      >
        {user.commentCount} {user.commentCount === 1 ? "comment" : "comments"}
      </Link>
    </Type>
  );
}
