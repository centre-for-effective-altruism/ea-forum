"use client";

import type { PostListItem } from "@/lib/posts/postLists";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { useRecommendationAnalytics } from "@/lib/hooks/useRecommendationAnalytics";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import PostTripleDotMenu from "./PostTripleDotMenu";
import PostsTooltip from "../PostsTooltip";
import UsersName from "../UsersName";
import Tooltip from "../Tooltip";
import Score from "../Score";
import Type from "../Type";

export default function PostRecommendationItem({
  post,
  disableAnalytics,
}: Readonly<{
  post: PostListItem;
  disableAnalytics?: boolean;
}>) {
  const { title, baseScore, voteCount, user, coauthors } = post;
  const href = postGetPageUrl({ post });
  const { onClick: onClickCell } = useClickableCell({ href });
  const { ref, onClick } = useRecommendationAnalytics(
    post._id,
    onClickCell,
    disableAnalytics,
  );
  return (
    <article
      data-component="PostRecommendationItem"
      className="
        flex items-center gap-3 p-2 rounded max-w-full
        cursor-pointer hover:bg-gray-200
      "
      onClick={onClick}
      ref={ref}
    >
      <div className="min-w-[40px] flex justify-end">
        <Score
          baseScore={baseScore}
          voteCount={voteCount}
          orientation="horizontal"
        />
      </div>
      <PostsTooltip post={post} className="grow truncate">
        <Type style="postTitle" className="truncate">
          {title}
        </Type>
      </PostsTooltip>
      <div className="whitespace-nowrap text-gray-600 flex items-center gap-[2px]">
        <InteractionWrapper>
          <Type style="bodySmall">
            <UsersName user={user} tooltipPlacement="bottom-end" />
          </Type>
        </InteractionWrapper>
        {coauthors && coauthors.length > 0 && (
          <Tooltip
            placement="bottom-end"
            title={
              <div>
                {coauthors.map((coauthor) => (
                  <Type style="bodySmall" key={coauthor._id}>
                    {coauthor.displayName}
                  </Type>
                ))}
              </div>
            }
          >
            <Type style="bodySmall">+{coauthors.length} more</Type>
          </Tooltip>
        )}
      </div>
      <InteractionWrapper>
        <PostTripleDotMenu post={post} orientation="vertical" />
      </InteractionWrapper>
    </article>
  );
}
