"use client";

import type { Placement } from "@floating-ui/react";
import type { ReactNode } from "react";
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

const DeletedAccountTooltip = ({ children }: { children: ReactNode }) => (
  <Tooltip As="span" title={<Type>This user account has been deleted</Type>}>
    {children}
  </Tooltip>
);

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
  const viewerIsMod = userIsModOrAdmin(currentUser);

  if (!user || (user.deleted && !viewerIsMod)) {
    return <DeletedAccountTooltip>[anonymous]</DeletedAccountTooltip>;
  }

  let profileUrl = userGetProfileUrl({ user });
  if (pageSectionContext) {
    profileUrl += `?from=${pageSectionContext}`;
  }

  if (user.deleted) {
    return (
      <DeletedAccountTooltip>
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
      </DeletedAccountTooltip>
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
