import { getCurrentUser } from "@/lib/users/currentUser";
import { getCurrentClientId } from "@/lib/clientIds/currentClientId";
import RecommendationService from "@/lib/recommendations/RecommendationService";
import PostRecommendationItem from "./PostRecommendationItem";
import Type from "../Type";

export default async function MorePostsLikeThis({
  postId,
}: Readonly<{
  postId: string;
}>) {
  const [currentUser, clientId] = await Promise.all([
    getCurrentUser(),
    getCurrentClientId(),
  ]);
  const recommendationService = new RecommendationService();
  const posts = await recommendationService.recommend(currentUser, clientId, 3, {
    name: "tagWeightedCollabFilter",
    postId,
  });
  return (
    <div
      data-component="MorePostsLikeThis"
      className="rounded bg-gray-100 px-2 py-4"
    >
      <Type style="sectionTitleSmall" className="!text-[14px] mb-2 px-2">
        More posts like this
      </Type>
      {posts.map((post) => (
        <PostRecommendationItem key={post._id} post={post} />
      ))}
    </div>
  );
}
