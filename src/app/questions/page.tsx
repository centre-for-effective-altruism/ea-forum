import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import ViewBasedPostsList from "@/components/PostsList/ViewBasedPostsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import NewQuestionButton from "@/components/Questions/NewQuestionButton";
import SectionTitle from "@/components/SectionTitle";
import TextLinkButton from "@/components/TextLinkButton";
import Type from "@/components/Type";
import Link from "@/components/Link";

const topQuestionsLimit = 5;
const recentQuestionActivityLimit = 12;

export const metadata: Metadata = {
  title: "All questions",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/questions"),
  },
};

export default function QuestionsPage() {
  return (
    <HomePageColumns pageContext="questionsPage">
      <div className="max-w-[765px] mx-auto flex flex-col gap-6 pb-20">
        <Type style="postsPageTitle">
          <Link href="/questions">Questions</Link>
        </Type>
        <AnalyticsContext pageSectionContext="topQuestions" capturePostItemOnMount>
          <section>
            <SectionTitle title="Top questions" rootClassName="mb-3" />
            <Suspense fallback={<PostsListSkeleton count={topQuestionsLimit} />}>
              <ViewBasedPostsList
                view={{ view: "topQuestions", limit: topQuestionsLimit }}
                bottomRightNode={
                  <TextLinkButton href="/all-posts?filter=questions&sortedBy=top&timeframe=allTime">
                    View all top questions
                  </TextLinkButton>
                }
                cacheLoggedOut
              />
            </Suspense>
          </section>
        </AnalyticsContext>
        <AnalyticsContext
          pageSectionContext="recentQuestionActivity"
          capturePostItemOnMount
        >
          <section>
            <SectionTitle title="Recent activity" rootClassName="mb-3">
              <Suspense>
                <NewQuestionButton />
              </Suspense>
            </SectionTitle>
            <Suspense
              fallback={<PostsListSkeleton count={recentQuestionActivityLimit} />}
            >
              <ViewBasedPostsList
                view={{
                  view: "recentQuestionActivity",
                  limit: recentQuestionActivityLimit,
                }}
                bottomRightNode={
                  <TextLinkButton href="/all-posts?filter=questions&sortedBy=new&timeframe=allTime">
                    View all questions
                  </TextLinkButton>
                }
                cacheLoggedOut
              />
            </Suspense>
          </section>
        </AnalyticsContext>
      </div>
    </HomePageColumns>
  );
}
