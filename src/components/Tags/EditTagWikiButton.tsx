"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userCanEditTagWiki } from "@/lib/users/userHelpers";
import PencilIcon from "@heroicons/react/24/solid/PencilIcon";
import Type from "../Type";
import Link from "../Link";

export default function EditTagWikiButton() {
  const { currentUser } = useCurrentUser();
  if (!userCanEditTagWiki(currentUser)) {
    return null;
  }
  return (
    <Type style="bodyHeavy">
      <Link
        href="/topics/wiki"
        className="
          flex items-center gap-1 text-primary hover:text-primary-light
          whitespace-nowrap
        "
      >
        <PencilIcon className="w-4" />
        Edit wiki
      </Link>
    </Type>
  );
}
