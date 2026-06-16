import { Suspense } from "react";
import CommentsSectionSkeleton from "../Comments/CommentsSectionSkeleton";
import FooterRecommendations from "./FooterRecommendations";
import CommentsSection from "../Comments/CommentsSection";
import PostDisplaySkeleton from "./PostDisplaySkeleton";
import PostsDisplay from "./PostsDisplay";
import PostColumn from "./PostColumn";

export default async function PostsPage({
  postId,
  sequenceId,
}: Readonly<{
  postId: string;
  sequenceId?: string;
}>) {
  void sequenceId;
  return (
    <div data-component="PostsPage" className="pt-[110px]">
      <div className="px-2">
        <Suspense fallback={<PostDisplaySkeleton />}>
          <PostsDisplay postId={postId} sequenceId={sequenceId} />
        </Suspense>
        <PostColumn>
          <Suspense fallback={<CommentsSectionSkeleton />}>
            <CommentsSection postId={postId} className="mb-20" />
          </Suspense>
        </PostColumn>
      </div>
      <div className="w-full bg-gray-0 pt-15 pb-20">
        <PostColumn>
          <Suspense>
            <FooterRecommendations postId={postId} />
          </Suspense>
        </PostColumn>
      </div>
    </div>
  );
}
