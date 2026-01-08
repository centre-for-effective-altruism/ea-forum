import { Suspense } from "react";
import PostsDisplay from "@/components/PostsPage/PostsDisplay";
import PostDisplaySkeleton from "@/components/PostsPage/PostDisplaySkeleton";
import FooterRecommendations from "@/components/PostsPage/FooterRecommendations";
import CommentsSectionSkeleton from "@/components/Comments/CommentsSectionSkeleton";
import CommentsSection from "@/components/Comments/CommentsSection";

export default async function PostsPage({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  return (
    <div data-component="PostsPage">
      <div className="w-[698px] max-w-full mx-auto">
        <Suspense fallback={<PostDisplaySkeleton />}>
          <PostsDisplay postId={_id} />
        </Suspense>
        <Suspense fallback={<CommentsSectionSkeleton />}>
          <CommentsSection postId={_id} className="mb-20" />
        </Suspense>
      </div>
      <Suspense>
        <FooterRecommendations postId={_id} />
      </Suspense>
    </div>
  );
}
