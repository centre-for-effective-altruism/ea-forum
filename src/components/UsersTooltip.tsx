import type { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { UserBase } from "@/lib/users/userQueries";
import { formatRelativeTime } from "@/lib/timeUtils";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import { formatStat } from "@/lib/formatHelpers";
import UserProfileImage from "./UserProfileImage";
import Tooltip from "./Tooltip";
import Type from "./Type";

const formatRole = (
  jobTitle?: string | null,
  organization?: string | null,
): string =>
  jobTitle && organization
    ? `${jobTitle} @ ${organization}`
    : ((jobTitle || organization) ?? "");

const formatBio = (bio: string | null): string => htmlToTextDefault(bio ?? "");

export default function UsersTooltip({
  user,
  placement = "bottom-start",
  As = "div",
  children,
}: Readonly<{
  user: UserBase | null;
  placement?: Placement;
  As?: ElementType;
  children: ReactNode;
}>) {
  if (!user) {
    return <>{children}</>;
  }
  const {
    displayName,
    createdAt,
    jobTitle,
    organization,
    biographyHtml,
    karma,
    postCount,
    commentCount,
  } = user;
  const role = formatRole(jobTitle, organization);
  const bio = formatBio(biographyHtml);
  return (
    <Tooltip
      placement={placement}
      As={As}
      tooltipClassName="bg-gray-0! text-gray-900! p-0! shadow w-[270px]"
      title={
        <div
          data-component="UsersTooltip"
          className="flex flex-col gap-3 p-3 border border-gray-200 rounded"
        >
          <div className="flex items-center gap-3">
            <UserProfileImage user={user} size={40} />
            <div>
              <Type style="postTitle" className="truncate">
                {displayName}
              </Type>
              {createdAt && (
                <Type className="text-gray-600 truncate">
                  Joined {formatRelativeTime(createdAt, { style: "short" })} ago
                </Type>
              )}
            </div>
          </div>
          {role && <Type className="line-clamp-3">{role}</Type>}
          {bio && <Type className="line-clamp-5 text-gray-600">{bio}</Type>}
          <div className="flex items-center justify-between px-[1em]">
            {typeof karma === "number" && (
              <div className="text-center">
                <Type style="postTitle">{formatStat(karma)}</Type>
                <Type className="text-gray-600">Karma</Type>
              </div>
            )}
            {typeof postCount === "number" && (
              <div className="text-center">
                <Type style="postTitle">{formatStat(postCount)}</Type>
                <Type className="text-gray-600">Posts</Type>
              </div>
            )}
            {typeof commentCount === "number" && (
              <div className="text-center">
                <Type style="postTitle">{formatStat(commentCount)}</Type>
                <Type className="text-gray-600">Comments</Type>
              </div>
            )}
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
