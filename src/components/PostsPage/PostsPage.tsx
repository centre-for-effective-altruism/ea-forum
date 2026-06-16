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
  return (
    <div data-component="PostsPage" className="pt-[110px]">
      <div className="px-2 pt-28 pb-16 bg-post-body-bg">
        <Suspense fallback={<PostDisplaySkeleton />}>
          <PostsDisplay postId={postId} sequenceId={sequenceId} />
        </Suspense>
        <PostColumn>
          <Suspense fallback={<CommentsSectionSkeleton />}>
            <CommentsSection postId={postId} />
          </Suspense>
        </PostColumn>
      </div>
      <div className="w-full pt-16 pb-20 bg-post-footer-bg">
        <PostColumn>
          <Suspense>
            <FooterRecommendations postId={postId} />
          </Suspense>
        </PostColumn>
      </div>
    </div>
  );
}
