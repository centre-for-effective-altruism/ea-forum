"use client";

import type { FC } from "react";
import clsx from "clsx";
import type { UserBase } from "@/lib/users/userQueries";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import UserProfileImage from "./UserProfileImage";
import UsersTooltip from "./UsersTooltip";
import Link from "./Link";

const AvatarLink: FC<{
  user: UserBase;
  size: number;
  className?: string;
}> = ({ user, size, className }) => (
  <UsersTooltip user={user} As="span" className={className}>
    <Link
      href={userGetProfileUrl({ user })}
      aria-label={user.displayName ?? undefined}
    >
      <UserProfileImage
        user={user}
        size={size}
        className="transition hover:opacity-80"
      />
    </Link>
  </UsersTooltip>
);

export default function StackedUserAvatars({
  users,
  size,
  className,
}: Readonly<{
  users: ReadonlyArray<UserBase | null | undefined>;
  size: number;
  className?: string;
}>) {
  const present = users.filter((u): u is UserBase => !!u);
  if (present.length === 0) {
    return null;
  }
  if (present.length === 1) {
    return <AvatarLink user={present[0]} size={size} className={className} />;
  }

  const overlap = Math.round(size / 3);

  return (
    <div
      className={clsx("flex items-center", className)}
      data-component="StackedUserAvatars"
    >
      {present.map((user, i) => (
        <div
          key={user._id}
          className="relative flex rounded-full ring-2 ring-background"
          style={{
            marginLeft: i > 0 ? -overlap : undefined,
            zIndex: present.length - i,
          }}
        >
          <AvatarLink user={user} size={size} />
        </div>
      ))}
    </div>
  );
}
