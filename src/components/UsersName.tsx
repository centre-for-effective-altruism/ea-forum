"use client";

import type { Placement } from "@floating-ui/react";
import type { UserBase } from "@/lib/users/userQueries";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userIsModOrAdmin, userGetProfileUrl } from "@/lib/users/userHelpers";
import clsx from "clsx";
import UsersTooltip from "./UsersTooltip";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

type LightweightUsersNameUser = {
  slug: string | null;
  displayName: string | null;
  deleted?: boolean | null;
};

type UsersNameUser = UserBase | LightweightUsersNameUser;

const isUserBase = (user: UsersNameUser): user is UserBase =>
  "_id" in user &&
  "createdAt" in user &&
  "profileImageId" in user &&
  "karma" in user &&
  "postCount" in user &&
  "commentCount" in user;

export default function UsersName({
  user,
  pageSectionContext,
  tooltipPlacement,
  className,
}: Readonly<{
  user: UsersNameUser | null | undefined;
  pageSectionContext?: string;
  tooltipPlacement?: Placement;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();

  if (!user) {
    return <span>[anonymous]</span>;
  }

  let profileUrl = userGetProfileUrl({ user });
  if (pageSectionContext) {
    profileUrl += `?from=${pageSectionContext}`;
  }

  if (user.deleted) {
    if (!userIsModOrAdmin(currentUser)) {
      return (
        <Tooltip As="span" title={<Type>This user account has been deleted</Type>}>
          [anonymous]
        </Tooltip>
      );
    }

    return (
      <Tooltip As="span" title={<Type>This user account has been deleted</Type>}>
        <span className={clsx("group inline-flex", className)}>
          <span className="group-hover:hidden group-focus-within:hidden">
            [anonymous]
          </span>
          <Link
            href={profileUrl}
            className="hidden group-hover:inline group-focus-within:inline"
          >
            {user.displayName}
          </Link>
        </span>
      </Tooltip>
    );
  }

  return (
    <UsersTooltip
      user={isUserBase(user) ? user : null}
      As="span"
      placement={tooltipPlacement}
    >
      <Link href={profileUrl} className={className}>
        {user.displayName}
      </Link>
    </UsersTooltip>
  );
}
