import { Suspense } from "react";
import PostsDisplay from "@/components/PostsPage/PostsDisplay";
import PostDisplaySkeleton from "@/components/PostsPage/PostDisplaySkeleton";
import FooterRecommendations from "@/components/PostsPage/FooterRecommendations";
import CommentsSectionSkeleton from "@/components/Comments/CommentsSectionSkeleton";
import CommentsSection from "@/components/Comments/CommentsSection";
import PostColumn from "@/components/PostsPage/PostColumn";

export default async function PostsPage({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  return (
    <div data-component="PostsPage">
      <Suspense fallback={<PostDisplaySkeleton />}>
        <PostsDisplay postId={_id} />
      </Suspense>
      <PostColumn>
        <Suspense fallback={<CommentsSectionSkeleton />}>
          <CommentsSection postId={_id} className="mb-20" />
        </Suspense>
      </PostColumn>
      <div className="w-full bg-(--background) pt-15 pb-20">
        <PostColumn>
          <Suspense>
            <FooterRecommendations postId={_id} />
          </Suspense>
        </PostColumn>
      </div>
    </div>
  );
}
