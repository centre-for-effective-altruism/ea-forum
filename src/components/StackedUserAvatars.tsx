"use client";

import clsx from "clsx";
import UserProfileImage from "./UserProfileImage";
import Tooltip from "./Tooltip";
import Type from "./Type";

type StackedUser = {
  _id: string;
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
    return <UserProfileImage user={present[0]} size={size} className={className} />;
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
            <UserProfileImage
              user={user}
              size={size}
              className="ring-2 ring-background"
            />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
