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
          <PostsList
            posts={moreFromAuthor}
            className="mb-12"
            postItemClassName="bg-background!"
          />
        </>
      )}
      {curatedAndPopular.length > 0 && (
        <>
          <Type style="sectionTitleLarge" className="mb-3">
            Curated and popular this week
          </Type>
          <PostsList
            posts={curatedAndPopular}
            viewType="card"
            className="mb-12"
            postItemClassName="bg-background!"
          />
        </>
      )}
      {recentOpportunities.length > 0 && (
        <>
          <Type style="sectionTitleLarge" className="mb-3">
            Recent opportunities to take action
          </Type>
          <PostsList
            posts={recentOpportunities}
            postItemClassName="bg-background!"
          />
        </>
      )}
    </>
  );
}
