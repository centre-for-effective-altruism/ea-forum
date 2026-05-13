import { Suspense } from "react";
import {
  fetchFeaturedCuratedPostsList,
  fetchFeaturedPostsList,
  type PostListItem,
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

export default async function AdminFeaturedPage() {
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?._id ?? null;
  const [curated, magic] = await Promise.all([
    fetchFeaturedCuratedPostsList(currentUserId),
    fetchFeaturedPostsList(currentUserId),
  ]);

  const seen = new Set<string>();
  const combined: PostListItem[] = [];
  for (const post of [...curated, ...magic]) {
    if (!seen.has(post._id)) {
      seen.add(post._id);
      combined.push(post);
    }
  }
  const topPosts = combined.slice(0, TOP_CARD_COUNT);
  const restPosts = combined.slice(TOP_CARD_COUNT);

  return (
    <AnalyticsContext pageContext="adminFeatured">
      <div className="mx-auto w-full max-w-[1200px] px-2 py-4 sm:p-4 md:p-8">
        <Type style="sectionTitleLarge" className="mb-2">
          Featured
        </Type>
        <div className="mb-10 grid grid-cols-1 gap-px bg-gray-300 outline outline-1 outline-gray-300 sm:grid-cols-[2fr_1fr]">
          {topPosts[0] && <MagazinePostsItem post={topPosts[0]} />}
          {topPosts.length > 1 && (
            <div className="flex flex-col gap-px">
              {topPosts.slice(1).map((post) => (
                <MagazinePostsItem key={post._id} post={post} variant="compact" />
              ))}
            </div>
          )}
        </div>
        <Type style="sectionTitleLarge" className="mb-2">
          Popular comments
        </Type>
        <div className="mb-10">
          <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
            <PopularCommentsList initialLimit={5} />
          </Suspense>
        </div>
        <div className="grid grid-cols-1 gap-px bg-gray-300 outline outline-1 outline-gray-300 sm:grid-cols-2">
          {restPosts.map((post) => (
            <MagazinePostsItem key={post._id} post={post} />
          ))}
        </div>
      </div>
    </AnalyticsContext>
  );
}
