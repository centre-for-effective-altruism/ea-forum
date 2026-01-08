import { Suspense } from "react";
import PostsDisplay from "@/components/PostsPage/PostsDisplay";
import PostDisplaySkeleton from "@/components/PostsPage/PostDisplaySkeleton";
import LazyCommentsSection from "@/components/Comments/LazyCommentsSection";
import FooterRecommendations from "@/components/PostsPage/FooterRecommendations";
import CommentsSectionSkeleton from "@/components/Comments/CommentsSectionSkeleton";

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
          <LazyCommentsSection postId={_id} className="mb-20" />
        </Suspense>
        <Suspense>
          <FooterRecommendations postId={_id} />
        </Suspense>
      </div>
    </div>
  );
}
