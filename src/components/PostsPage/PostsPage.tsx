import { Suspense } from "react";
import CommentsSectionSkeleton from "../Comments/CommentsSectionSkeleton";
import FooterRecommendations from "./FooterRecommendations";
import CommentsSection from "../Comments/CommentsSection";
import PostTableOfContentsAsync from "./PostTableOfContentsAsync";
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
    <div data-component="PostsPage">
      <div className="px-2 pt-28 pb-16 bg-post-body-bg">
        <PostColumn
          left={
            <Suspense fallback={null}>
              <PostTableOfContentsAsync
                postId={postId}
                className="sticky left-0 top-18 pl-8 pt-5"
              />
            </Suspense>
          }
        >
          <Suspense fallback={<PostDisplaySkeleton />}>
            <PostsDisplay postId={postId} sequenceId={sequenceId} />
          </Suspense>
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
