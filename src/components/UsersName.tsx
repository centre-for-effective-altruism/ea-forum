import type { Placement } from "@floating-ui/react";
import type { PostListItem } from "@/lib/posts/postLists";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import UsersTooltip from "./UsersTooltip";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

export default function UsersName({
  user,
  pageSectionContext,
  tooltipPlacement,
  className,
}: Readonly<{
  user: PostListItem["user"] | undefined;
  pageSectionContext?: string;
  tooltipPlacement?: Placement;
  className?: string;
}>) {
  if (!user || user.deleted) {
    return (
      <Tooltip As="span" title={<Type>This user account has been deleted</Type>}>
        [anonymous]
      </Tooltip>
    );
  }

  let profileUrl = userGetProfileUrl({ user });
  if (pageSectionContext) {
    profileUrl += `?from=${pageSectionContext}`;
  }

  return (
    <UsersTooltip user={user} As="span" placement={tooltipPlacement}>
      <Link href={profileUrl} className={className}>
        {user?.displayName}
      </Link>
    </UsersTooltip>
  );
}
