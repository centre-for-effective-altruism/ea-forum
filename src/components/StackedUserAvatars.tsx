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
  maxVisible = 3,
  className,
}: Readonly<{
  users: ReadonlyArray<StackedUser | null | undefined>;
  size: number;
  maxVisible?: number;
  className?: string;
}>) {
  const present = users.filter((u): u is StackedUser => !!u);
  if (present.length === 0) {
    return null;
  }
  if (present.length === 1) {
    return <UserProfileImage user={present[0]} size={size} className={className} />;
  }

  const fitsAll = present.length <= maxVisible;
  const visible = fitsAll ? present : present.slice(0, maxVisible - 1);
  const overflow = present.length - visible.length;
  const overlap = Math.round(size / 3);

  return (
    <div
      className={clsx("flex items-center", className)}
      data-component="StackedUserAvatars"
    >
      {visible.map((user, i) => (
        <div
          key={user._id}
          className="relative"
          style={{
            marginLeft: i > 0 ? -overlap : undefined,
            zIndex: visible.length - i + (overflow > 0 ? 1 : 0),
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
      {overflow > 0 && (
        <div
          className="relative rounded-full bg-gray-200 ring-2 ring-background flex items-center justify-center"
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
            zIndex: 0,
          }}
        >
          <Type style="bodySmall" className="text-gray-800">
            +{overflow}
          </Type>
        </div>
      )}
    </div>
  );
}
