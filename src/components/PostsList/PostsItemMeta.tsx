import type { PostListItem } from "@/lib/posts/postLists";
import { formatPostItemHiddenAuthors, formatThousands } from "@/lib/formatHelpers";
import { getPostReadTimeMinutes } from "@/lib/posts/postsHelpers";
import { InteractionWrapper } from "@/lib/hooks/useClickableCell";
import TruncationContainer from "../TruncationContainer";
import UsersName from "../UsersName";
import TimeAgo from "../TimeAgo";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostsItemMeta({
  post: {
    user,
    coauthors,
    postedAt,
    curatedDate,
    readTimeMinutesOverride,
    contents,
  },
  hideCuratedDate,
}: Readonly<{
  post: PostListItem;
  hideCuratedDate?: boolean;
}>) {
  const wordCount = contents?.wordCount ?? null;
  const readTime = getPostReadTimeMinutes(readTimeMinutesOverride, wordCount);
  return (
    <InteractionWrapper className="grow min-w-0 text-gray-600">
      <TruncationContainer
        items={[
          <UsersName key="author" user={user} />,
          ...(coauthors ?? []).map((coauthor) => (
            <span key={coauthor._id}>
              <span className="coauthor-comma">, </span>
              <UsersName user={coauthor} />
            </span>
          )),
        ]}
        tooltipClassName="[&_.coauthor-comma]:hidden"
        gap={0}
        hiddenItemsTooltip
        afterNodeTextStyle="bodySmallMedium"
        afterNodeFormat={formatPostItemHiddenAuthors}
        finalNode={
          <>
            <span className="px-1">·</span>
            <TimeAgo
              As="span"
              textStyle="bodySmallMedium"
              time={postedAt}
              tooltipPrefix="Posted on "
              includeAgo
            />
            {!hideCuratedDate && curatedDate && (
              <span className="max-sm:hidden">
                <span className="px-1">·</span>
                <span>Curated </span>
                <TimeAgo
                  As="span"
                  textStyle="bodySmallMedium"
                  time={curatedDate}
                  tooltipPrefix="Curated on "
                  includeAgo
                />
              </span>
            )}
            <Tooltip
              title={
                wordCount ? (
                  <Type style="bodySmall">
                    {formatThousands(wordCount)} word{wordCount === 1 ? "" : "s"}
                  </Type>
                ) : null
              }
              As="span"
              className="max-sm:hidden"
            >
              <span className="px-1">·</span>
              <span>{readTime}m read</span>
            </Tooltip>
          </>
        }
      />
    </InteractionWrapper>
  );
}
