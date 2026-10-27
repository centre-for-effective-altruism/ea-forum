import { Suspense } from "react";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import { tagGetHistoryUrl, tagGetPageUrl } from "@/lib/tags/tagHelpers";
import { appendQueryParams } from "@/lib/routeHelpers";
import {
  getTagEditRestriction,
  tagEditRestrictionMessages,
} from "@/lib/tags/tagPermissions";
import ClockIcon from "@heroicons/react/24/outline/ClockIcon";
import TopicDiscussionButton from "./TopicDiscussionButton";
import TopicEditButton from "./TopicEditButton";
import Type from "../Type";
import Link from "../Link";

export default function TopicHeaderActions({
  tag,
  currentUser,
}: Readonly<{
  tag: TopicPageTag;
  currentUser: CurrentUser | null;
}>) {
  const restriction = getTagEditRestriction(tag, currentUser);
  return (
    <div
      data-component="TopicHeaderActions"
      className="flex flex-wrap items-center gap-4"
    >
      <TopicEditButton
        href={appendQueryParams(tagGetPageUrl({ tag }), { edit: "true" })}
        restrictionReason={
          restriction ? tagEditRestrictionMessages[restriction] : null
        }
      />
      <Type style="bodyMedium">
        <Link
          href={tagGetHistoryUrl({ tag })}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-1000"
        >
          <ClockIcon className="w-4" />
          History
        </Link>
      </Type>
      <Suspense fallback={<div className="h-5 w-24 bg-gray-200 rounded" />}>
        <TopicDiscussionButton tag={tag} />
      </Suspense>
    </div>
  );
}
