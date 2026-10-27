import { Suspense } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy } from "@/lib/tags/topicPageParams";
import PostColumn from "../PostsPage/PostColumn";
import Type from "../Type";
import AddPostsToTopic from "./AddPostsToTopic";
import TopicContributorHighlightProvider from "./TopicContributorHighlightProvider";
import TopicContributors from "./TopicContributors";
import TopicDescription from "./TopicDescription";
import TopicHeaderActions from "./TopicHeaderActions";
import TopicIntroSequence from "./TopicIntroSequence";
import TopicIntroSequenceSkeleton from "./TopicIntroSequenceSkeleton";
import TopicPostsList from "./TopicPostsList";
import TopicPostsListSkeleton from "./TopicPostsListSkeleton";
import TopicQuickTakes from "./TopicQuickTakes";
import TopicQuickTakesSkeleton from "./TopicQuickTakesSkeleton";
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
              <TopicTableOfContents
                tag={tag}
                className="[&_nav]:max-h-none [&_nav]:overflow-visible [&_nav]:pb-0"
              />
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
              <Suspense fallback={<TopicIntroSequenceSkeleton />}>
                <TopicIntroSequence sequenceId={tag.introSequenceId} />
              </Suspense>
            )}
            {!tag.wikiOnly && (
              <>
                <AnalyticsContext pageSectionContext="tagsSection">
                  <Suspense fallback={<TopicPostsListSkeleton tag={tag} />}>
                    <TopicPostsList
                      tag={tag}
                      sortedBy={sortedBy}
                      bottomRightNode={
                        <AddPostsToTopic tag={{ _id: tag._id, name: tag.name }} />
                      }
                    />
                  </Suspense>
                </AnalyticsContext>
                <AnalyticsContext pageSectionContext="quickTakesSection">
                  <Suspense fallback={<TopicQuickTakesSkeleton />}>
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
