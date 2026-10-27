import { Suspense } from "react";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy, TopicPageTab } from "@/lib/tags/topicPageParams";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import TopicContributorHighlightProvider from "./TopicContributorHighlightProvider";
import TopicDescriptionSkeleton from "./TopicDescriptionSkeleton";
import TopicTableOfContents from "./TopicTableOfContents";
import TopicSidebarSkeleton from "./TopicSidebarSkeleton";
import TopicSubscribeButton from "./TopicSubscribeButton";
import TopicSubtagsSidebar from "./TopicSubtagsSidebar";
import TopicWriteNewButton from "./TopicWriteNewButton";
import TopicHeaderActions from "./TopicHeaderActions";
import TopicIntroSequence from "./TopicIntroSequence";
import TopicRelatedTopics from "./TopicRelatedTopics";
import TopicContributors from "./TopicContributors";
import TopicDescription from "./TopicDescription";
import TopicQuickTakes from "./TopicQuickTakes";
import TopicPostsList from "./TopicPostsList";
import AddPostsToTopic from "./AddPostsToTopic";
import TopicTabs from "./TopicTabs";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import CloudinaryImage from "../CloudinaryImage";
import Type from "../Type";

export default function CoreTopicLayout({
  tag,
  currentUser,
  sortedBy,
}: Readonly<{
  tag: TopicPageTag;
  currentUser: CurrentUser | null;
  sortedBy: TopicPostsSortedBy;
  tab: TopicPageTab;
}>) {
  return (
    <TopicContributorHighlightProvider>
      <div data-component="CoreTopicLayout" className="w-full pb-16">
        <header className="relative overflow-hidden bg-always-black">
          {tag.bannerImageId && (
            <div aria-hidden className="absolute inset-0 pointer-events-none">
              <CloudinaryImage
                publicId={tag.bannerImageId}
                height={245}
                fullWidthHeader
                loading="eager"
                wrapperClassName="block h-full"
                className="w-full h-full! object-cover"
              />
              <div
                className="
                  absolute inset-0
                  bg-[linear-gradient(to_top,rgb(0_0_0/0.7)_0%,rgb(0_0_0/0.3)_60%,rgb(0_0_0/0.15)_100%)]
                "
              />
            </div>
          )}
          <div
            className="
              relative max-w-[1100px] mx-auto px-4 pt-24 md:pt-36 pb-6
              flex flex-col gap-1 text-always-white
            "
          >
            <Type As="h1" style="postsPageTitle">
              {tag.deleted && "[Deleted] "}
              <span className="md:hidden">{tag.shortName || tag.name}</span>
              <span className="hidden md:inline">{tag.name}</span>
            </Type>
            {tag.subtitle && <Type style="body">{tag.subtitle}</Type>}
          </div>
        </header>
        <TopicTabs
          actions={
            <div className="flex items-center gap-2">
              <TopicWriteNewButton tag={{ _id: tag._id }} />
              {!tag.wikiOnly && (
                <TopicSubscribeButton
                  tag={{ _id: tag._id, name: tag.name, slug: tag.slug }}
                />
              )}
            </div>
          }
          panels={{
            posts: (
              <div className="flex flex-col gap-10">
                <AnalyticsContext pageSectionContext="tagsSection">
                  <Suspense fallback={<PostsListSkeleton count={10} />}>
                    <TopicPostsList tag={tag} sortedBy={sortedBy} />
                  </Suspense>
                  <AddPostsToTopic tag={{ _id: tag._id, name: tag.name }} />
                </AnalyticsContext>
                <AnalyticsContext pageSectionContext="quickTakesSection">
                  <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
                    <TopicQuickTakes tag={tag} />
                  </Suspense>
                </AnalyticsContext>
              </div>
            ),
            wiki: (
              <AnalyticsContext pageSectionContext="wikiSection">
                <div className="flex flex-col gap-6">
                  <TopicHeaderActions tag={tag} currentUser={currentUser} />
                  <TopicRelatedTopics tag={tag} />
                  <TopicDescription tag={tag} />
                  {tag.introSequenceId && (
                    <Suspense fallback={<TopicDescriptionSkeleton />}>
                      <TopicIntroSequence sequenceId={tag.introSequenceId} />
                    </Suspense>
                  )}
                </div>
              </AnalyticsContext>
            ),
          }}
          sidebars={{
            posts: (
              <TopicSubtagsSidebar
                tag={{
                  _id: tag._id,
                  name: tag.name,
                  shortName: tag.shortName,
                  slug: tag.slug,
                  core: tag.core,
                  postCount: tag.postCount,
                  description: null,
                }}
                subTags={tag.subTags}
              />
            ),
            wiki: (
              <div className="flex flex-col gap-6">
                <TopicTableOfContents tag={tag} />
                <Suspense fallback={<TopicSidebarSkeleton />}>
                  <TopicContributors tag={tag} />
                </Suspense>
              </div>
            ),
          }}
        />
      </div>
    </TopicContributorHighlightProvider>
  );
}
