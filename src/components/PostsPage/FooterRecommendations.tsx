import { getCurrentUser } from "@/lib/users/currentUser";
import {
  fetchCuratedAndPopularPostsList,
  fetchMoreFromAuthorPostsList,
  fetchRecentOpportunitiesPostsList,
} from "@/lib/posts/postLists";
import PostsList from "../PostsList/PostsList";
import Type from "../Type";

export default async function FooterRecommendations({ postId }: { postId: string }) {
  const currentUser = await getCurrentUser();
  const [moreFromAuthor, curatedAndPopular, recentOpportunities] = await Promise.all(
    [
      fetchMoreFromAuthorPostsList({
        currentUserId: currentUser?._id ?? null,
        postId,
        limit: 3,
      }),
      fetchCuratedAndPopularPostsList({
        currentUserId: currentUser?._id ?? null,
        limit: 3,
      }),
      fetchRecentOpportunitiesPostsList({
        currentUserId: currentUser?._id ?? null,
        limit: 3,
      }),
    ],
  );
  return (
    <>
      {moreFromAuthor.length > 0 && (
        <>
          <Type style="sectionTitleLarge" className="mb-3">
            More from the author
          </Type>
          <PostsList posts={moreFromAuthor} className="mb-12" />
        </>
      )}
      <Type style="sectionTitleLarge" className="mb-3">
        Curated and popular this week
      </Type>
      {/* TODO: This post list should always use card view */}
      <PostsList posts={curatedAndPopular} className="mb-12" />
      <Type style="sectionTitleLarge" className="mb-3">
        Recent opportunities to take action
      </Type>
      <PostsList posts={recentOpportunities} />
    </>
  );
}
