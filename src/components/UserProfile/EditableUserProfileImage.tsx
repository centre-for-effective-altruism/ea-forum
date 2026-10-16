"use client";

import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { captureException } from "@sentry/nextjs";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { userCanEditUser } from "@/lib/users/userHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import type { UserBase } from "@/lib/users/userQueries";
import toast from "react-hot-toast";
import PencilIcon from "@heroicons/react/24/solid/PencilIcon";
import UserProfileImage from "../UserProfileImage";

const size = 96;

export default function EditableUserProfileImage({
  user,
}: Readonly<{
  user: Pick<UserBase, "_id" | "displayName" | "profileImageId">;
}>) {
  const [profileImageId, setProfileImageId] = useState(user.profileImageId);
  const { currentUser } = useCurrentUser();

  const { onUploadImage, CloudinaryScript } = useImageUpload({
    imageType: "profileImageId",
    onSuccess: async (profileImageId: string) => {
      const toastId = toast.loading("Uploading...");
      try {
        await rpc.users.updateProfileImage({ userId: user._id, profileImageId });
        setProfileImageId(profileImageId);
        toast.success("Profile image updated");
      } catch (e) {
        captureException(e);
        console.error("Error updating profile image", e);
        toast.error("Something went wrong");
      }
      toast.dismiss(toastId);
    },
  });

  if (!userCanEditUser(currentUser, user)) {
    return <UserProfileImage user={user} size={size} />;
  }

  return (
    <button
      data-component="EditableUserProfileImage"
      style={{ width: size, height: size }}
      className="relative"
    >
      <CloudinaryScript />
      <UserProfileImage user={{ ...user, profileImageId }} size={size} />
      <div
        onClick={onUploadImage}
        className="
          absolute z-2 inset-0 w-full h-full flex items-center justify-center
          bg-always-black/50 text-always-white rounded-full cursor-pointer
          opacity-0 hover:opacity-100
        "
      >
        <PencilIcon className="w-6" />
      </div>
    </button>
  );
}
