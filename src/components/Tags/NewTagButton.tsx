"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userCanCreateTags } from "@/lib/users/userHelpers";
import FolderPlusIcon from "@heroicons/react/24/solid/FolderPlusIcon";
import Type from "../Type";
import Link from "../Link";

export default function NewTagButton() {
  const { currentUser } = useCurrentUser();
  if (!userCanCreateTags(currentUser)) {
    return null;
  }
  return (
    <Type style="bodyHeavy">
      <Link
        href="/topics/create"
        className="
          flex items-center gap-1 text-primary hover:text-primary-light
          whitespace-nowrap
        "
      >
        <FolderPlusIcon className="w-4" />
        New topic
      </Link>
    </Type>
  );
}
