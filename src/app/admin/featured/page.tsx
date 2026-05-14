import { Suspense } from "react";
import uniqBy from "lodash/uniqBy";
import {
  fetchFeaturedCuratedPostsList,
  fetchFeaturedPostsList,
} from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import PopularCommentsList from "@/components/HomePage/PopularCommentsList";
import QuickTakesListSkeleton from "@/components/QuickTakes/QuickTakesListSkeleton";
import Type from "@/components/Type";
import MagazinePostsItem from "./MagazinePostsItem";

// Throwaway admin-only preview of a future "Featured" page. Shows posts with
// DigestPosts.onsiteDigestStatus = "yes" posted in the last ~14 days, ordered
// the same way as the home page (curated first, then magic). Delete this
// directory (and the supporting helpers in postLists.ts) once the experiment
// concludes.
const TOP_CARD_COUNT = 3;
const POSTS_GRID =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-gray-300 [&>*]:border-r [&>*]:border-b [&>*]:border-gray-300";

export default async function AdminFeaturedPage() {
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?._id ?? null;
  const [curated, magic] = await Promise.all([
    fetchFeaturedCuratedPostsList(currentUserId),
    fetchFeaturedPostsList(currentUserId),
  ]);

  const combined = uniqBy([...curated, ...magic], "_id");
  const topPosts = combined.slice(0, TOP_CARD_COUNT);
  const restPosts = combined.slice(TOP_CARD_COUNT);

  return (
    <AnalyticsContext pageContext="adminFeatured">
      <div className="mx-auto w-full max-w-[1200px] px-2 py-4 sm:p-4 md:p-8">
        <Type style="sectionTitleLarge" className="mb-2">
          Featured
        </Type>
        <div className={`mb-10 ${POSTS_GRID}`}>
          {topPosts.map((post) => (
            <MagazinePostsItem key={post._id} post={post} />
          ))}
        </div>
        <Type style="sectionTitleLarge" className="mb-2">
          Popular comments
        </Type>
        <div className="mb-10">
          <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
            <PopularCommentsList initialLimit={5} />
          </Suspense>
        </div>
        <div className={POSTS_GRID}>
          {restPosts.map((post) => (
            <MagazinePostsItem key={post._id} post={post} />
          ))}
        </div>
      </div>
    </AnalyticsContext>
  );
}
