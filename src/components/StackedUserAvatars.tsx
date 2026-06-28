"use client";

import clsx from "clsx";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import UserProfileImage from "./UserProfileImage";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

type StackedUser = {
  _id: string;
  slug: string | null;
  displayName: string | null;
  profileImageId?: string | null;
};

export default function StackedUserAvatars({
  users,
  size,
  className,
}: Readonly<{
  users: ReadonlyArray<StackedUser | null | undefined>;
  size: number;
  className?: string;
}>) {
  const present = users.filter((u): u is StackedUser => !!u);
  if (present.length === 0) {
    return null;
  }
  if (present.length === 1) {
    const user = present[0];
    return (
      <Link
        href={userGetProfileUrl({ user })}
        className={className}
        aria-label={user.displayName ?? undefined}
      >
        <UserProfileImage user={user} size={size} />
      </Link>
    );
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
          className="relative"
          style={{
            marginLeft: i > 0 ? -overlap : undefined,
            zIndex: present.length - i,
          }}
        >
          <Tooltip title={<Type style="bodySmall">{user.displayName ?? ""}</Type>}>
            <Link href={userGetProfileUrl({ user })}>
              <UserProfileImage
                user={user}
                size={size}
                className="ring-2 ring-background"
              />
            </Link>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
