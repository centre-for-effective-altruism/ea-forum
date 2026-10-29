import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import ViewBasedPostsList from "@/components/PostsList/ViewBasedPostsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import ForumFavoritesList from "@/components/Recommendations/ForumFavoritesList";
import SectionTitle from "@/components/SectionTitle";
import Tooltip from "@/components/Tooltip";
import Type from "@/components/Type";

const curatedLimit = 12;
const forumFavoritesLimit = 10;

export const metadata: Metadata = {
  title: "Recommendations",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/recommendations"),
  },
};

export default function RecommendationsPage() {
  return (
    <AnalyticsContext
      pageSectionContext="recommendationsPage"
      capturePostItemOnMount
    >
      <div className="w-[765px] max-w-full mx-auto pt-6 pb-20 px-4 flex flex-col gap-6">
        <AnalyticsContext pageContext="curatedPage">
          <AnalyticsContext pageSectionContext="curatedPosts" capturePostItemOnMount>
            <section>
              <SectionTitle title="Curated Posts" rootClassName="mb-3" />
              <Suspense fallback={<PostsListSkeleton count={curatedLimit} />}>
                <ViewBasedPostsList
                  view={{ view: "curated", limit: curatedLimit }}
                  curatedIconLeft
                />
              </Suspense>
            </section>
          </AnalyticsContext>
        </AnalyticsContext>
        <section>
          <SectionTitle
            title={
              <Tooltip
                As="span"
                placement="top"
                title={
                  <Type style="bodySmall">
                    The highest karma frontpage posts that you haven&apos;t read yet
                  </Type>
                }
              >
                Forum Favorites
              </Tooltip>
            }
            anchor="forum-favorites"
            rootClassName="mb-3"
          />
          <Suspense fallback={<PostsListSkeleton count={forumFavoritesLimit} />}>
            <ForumFavoritesList limit={forumFavoritesLimit} />
          </Suspense>
        </section>
      </div>
    </AnalyticsContext>
  );
}
