"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import RectangleStackIcon from "@heroicons/react/24/solid/RectangleStackIcon";
import Type from "../Type";
import Link from "../Link";

export default function NewSequenceButton() {
  const { currentUser } = useCurrentUser();
  if (!currentUser) {
    return null;
  }
  return (
    <Type style="bodyHeavy">
      <Link
        href="/sequencesnew"
        className="
          flex items-center gap-1 text-primary hover:text-primary-light
          whitespace-nowrap
        "
      >
        <RectangleStackIcon className="w-4" />
        Create new sequence
      </Link>
    </Type>
  );
}
