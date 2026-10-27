import { Suspense } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy } from "@/lib/tags/topicPageParams";
import PostColumn from "../PostsPage/PostColumn";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import Type from "../Type";
import AddPostsToTopic from "./AddPostsToTopic";
import TopicContributorHighlightProvider from "./TopicContributorHighlightProvider";
import TopicContributors from "./TopicContributors";
import TopicDescription from "./TopicDescription";
import TopicHeaderActions from "./TopicHeaderActions";
import TopicIntroSequence from "./TopicIntroSequence";
import TopicPostsList from "./TopicPostsList";
import TopicQuickTakes from "./TopicQuickTakes";
import TopicRelatedTopics from "./TopicRelatedTopics";
import TopicSidebarSkeleton from "./TopicSidebarSkeleton";
import TopicSubscribeButton from "./TopicSubscribeButton";
import TopicTableOfContents from "./TopicTableOfContents";
import TopicTocColumn from "./TopicTocColumn";

export default function NormalTopicLayout({
  tag,
  currentUser,
  sortedBy,
}: Readonly<{
  tag: TopicPageTag;
  currentUser: CurrentUser | null;
  sortedBy: TopicPostsSortedBy;
}>) {
  return (
    <TopicContributorHighlightProvider>
      <div
        data-component="NormalTopicLayout"
        className="px-4 sm:px-2 pt-12 sm:pt-20 md:pt-28 pb-16 bg-post-body-bg"
      >
        <PostColumn
          left={
            <TopicTocColumn>
              <TopicTableOfContents tag={tag} />
              <Suspense fallback={<TopicSidebarSkeleton />}>
                <TopicContributors tag={tag} />
              </Suspense>
            </TopicTocColumn>
          }
        >
          <div className="flex flex-col gap-4 mb-10">
            <Type style="postsPageTitle" As="h1" id="top">
              {tag.deleted && <span className="text-gray-600">[Deleted] </span>}
              {tag.name}
            </Type>
            <div className="flex flex-wrap items-center gap-2">
              {!tag.wikiOnly && (
                <TopicSubscribeButton
                  tag={{ _id: tag._id, name: tag.name, slug: tag.slug }}
                />
              )}
              <TopicHeaderActions tag={tag} currentUser={currentUser} />
            </div>
            <TopicRelatedTopics tag={tag} />
          </div>
          <div className="flex flex-col gap-12">
            <AnalyticsContext pageSectionContext="wikiSection">
              <TopicDescription tag={tag} />
            </AnalyticsContext>
            {tag.introSequenceId && (
              <Suspense>
                <TopicIntroSequence sequenceId={tag.introSequenceId} />
              </Suspense>
            )}
            {!tag.wikiOnly && (
              <>
                <AnalyticsContext pageSectionContext="tagsSection">
                  <div className="flex flex-col gap-4">
                    <Suspense fallback={<PostsListSkeleton count={8} />}>
                      <TopicPostsList tag={tag} sortedBy={sortedBy} />
                    </Suspense>
                    <AddPostsToTopic tag={{ _id: tag._id, name: tag.name }} />
                  </div>
                </AnalyticsContext>
                <AnalyticsContext pageSectionContext="quickTakesSection">
                  <Suspense>
                    <TopicQuickTakes tag={tag} />
                  </Suspense>
                </AnalyticsContext>
              </>
            )}
          </div>
        </PostColumn>
      </div>
    </TopicContributorHighlightProvider>
  );
}
