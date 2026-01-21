import type { RecentDiscussionTag } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { tagGetUrl } from "@/lib/tags/tagHelpers";
import { CommentsListProvider } from "@/components/Comments/useCommentsList";
import RecentDiscussionsItem from "./RecentDiscussionsItem";
import CommentsList from "@/components/Comments/CommentsList";
import TagBody from "@/components/ContentStyles/TagBody";
import Link from "@/components/Link";
import Type from "@/components/Type";

export default function RecentDiscussionsTagDiscussed({
  tag,
}: Readonly<{
  tag: RecentDiscussionTag;
}>) {
  const comments = tag.comments;
  if (!comments.length) {
    // In theory, should never happen
    return null;
  }
  return (
    <RecentDiscussionsItem
      icon="Comment"
      iconVariant="primary"
      user={comments[0].user}
      action="commented on tag"
      tag={tag}
      timestamp={comments[0].postedAt}
    >
      <div className="mb-3">
        <Type style="postTitle" className="mb-2">
          <Link href={tagGetUrl({ tag })}>{tag.name}</Link>
        </Type>
        <Type className="text-gray-600">
          {tag.wikiOnly ? "Wiki page" : `Topic page — ${tag.postCount} posts`}
        </Type>
      </div>
      <TagBody html={tag.html} className="mb-4" />
      <CommentsListProvider comments={comments}>
        <CommentsList />
      </CommentsListProvider>
    </RecentDiscussionsItem>
  );
}
