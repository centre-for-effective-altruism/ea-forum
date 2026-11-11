import type { SequencePageChapter as SequencePageChapterData } from "@/lib/sequences/sequenceQueries";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import PostBody from "../ContentStyles/PostBody";
import PostReadCheckbox from "../PostReadCheckbox";
import PostsItem from "../PostsList/PostsItem";
import Type from "../Type";

export default function SequencePageChapter({
  chapter,
  sequenceId,
}: Readonly<{
  chapter: SequencePageChapterData;
  sequenceId: string;
}>) {
  return (
    <AnalyticsContext chapter={chapter._id}>
      <section data-component="SequencePageChapter" className="flex flex-col gap-4">
        {(chapter.title || chapter.subtitle) && (
          <div className="flex flex-col gap-1">
            {chapter.title && (
              <Type As="h2" style="sectionTitleLarge" className="text-gray-1000">
                {chapter.title}
              </Type>
            )}
            {chapter.subtitle && (
              <Type style="bodySmall" className="text-gray-600">
                {chapter.subtitle}
              </Type>
            )}
          </div>
        )}
        {chapter.html && <PostBody html={chapter.html} smallText />}
        {chapter.posts.length > 0 && (
          <div className="flex flex-col gap-1">
            {chapter.posts.map((post) => (
              <div key={post._id} className="flex items-center gap-2">
                <PostReadCheckbox
                  postId={post._id}
                  initialIsRead={!!post.readStatus?.[0]?.isRead}
                />
                <PostsItem post={post} sequenceId={sequenceId} className="min-w-0" />
              </div>
            ))}
          </div>
        )}
      </section>
    </AnalyticsContext>
  );
}
