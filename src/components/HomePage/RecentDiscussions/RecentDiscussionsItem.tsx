import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import type {
  RecentDiscussionComment,
  RecentDiscussionPost,
} from "@/lib/recentDiscussions/fetchRecentDiscussions";
import RecentDiscussionIcon, {
  RecentDiscussionIconName,
  RecentDiscussionIconVariant,
} from "./RecentDiscussionIcon";
import UsersName from "@/components/UsersName";
import TimeAgo from "@/components/TimeAgo";
import Link from "@/components/Link";

type RecentDiscussionItemDocument =
  | {
      post: RecentDiscussionPost;
      tag?: never;
    }
  | {
      post?: never;
      tag: RecentDiscussionComment;
    };

export type RecentDiscussionItemProps = RecentDiscussionItemDocument & {
  icon: RecentDiscussionIconName;
  iconVariant: RecentDiscussionIconVariant;
  user?: RecentDiscussionPost["user"];
  action: ReactNode;
  postTitleOverride?: string;
  postUrlOverride?: string;
  timestamp: Date | string;
  anonymous?: boolean;
  pageSubSectionContext?: string;
};

export default function RecentDiscussionsItem({
  icon,
  iconVariant,
  user,
  action,
  postTitleOverride,
  postUrlOverride,
  post,
  tag,
  timestamp,
  anonymous,
  pageSubSectionContext = "recentDiscussionThread",
  children,
}: Readonly<
  RecentDiscussionItemProps & {
    children: ReactNode;
  }
>) {
  return (
    <AnalyticsContext pageSubSectionContext={pageSubSectionContext}>
      <article
        data-component="RecentDiscussionsItem"
        className="flex flex-col text-gray-600 my-7 text-[14px] font-[500]"
      >
        <div className="flex gap-2">
          <RecentDiscussionIcon icon={icon} variant={iconVariant} />
          <div className="mb-3 leading-[1.5em]">
            {anonymous ? (
              "Somebody"
            ) : (
              <UsersName
                user={user}
                pageSectionContext={pageSubSectionContext}
                className="text-gray-1000 hover:opacity-70"
              />
            )}{" "}
            {action}{" "}
            {post && (
              <Link
                href={postUrlOverride ?? postGetPageUrl({ post })}
                className="text-gray-1000 hover:opacity-70"
              >
                {postTitleOverride ?? post.title}
              </Link>
            )}
            {
              tag &&
                // TODO: Add recent discussions tag UI here
                null
              /*
              <TagsTooltip tag={tag} As="span">
                <Link to={tagGetUrl(tag)} className={classes.primaryText}>
                  {tag.name}
                </Link>
              </TagsTooltip>
                 */
            }{" "}
            <TimeAgo time={timestamp} includeAgo As="span" />
          </div>
        </div>
        {children && (
          <div className="flex gap-2">
            {/* dummy icon container here */}
            <div
              className="
                grow min-w-[0] bg-gray-0 text-gray-1000 rounded p-3
                border-1 border-gray-200
              "
            >
              {children}
            </div>
          </div>
        )}
      </article>
    </AnalyticsContext>
  );
}
