import { Suspense } from "react";
import RequestCookiesProvider from "../Cookies/RequestCookiesProvider";
import CommentsSectionSkeleton from "../Comments/CommentsSectionSkeleton";
import FooterRecommendations from "./FooterRecommendations";
import CommentsSection from "../Comments/CommentsSection";
import PostDisplaySkeleton from "./PostDisplaySkeleton";
import PostsDisplay from "./PostsDisplay";
import PostColumn from "./PostColumn";

type PostsPageParams = Promise<{
  postId: string;
  sequenceId?: string;
  showSharePopup?: boolean;
}>;

async function PostsDisplayLoader({
  params,
}: Readonly<{ params: PostsPageParams }>) {
  const { postId, sequenceId, showSharePopup } = await params;
  return (
    <RequestCookiesProvider>
      <PostsDisplay
        postId={postId}
        sequenceId={sequenceId}
        showSharePopup={showSharePopup}
      />
    </RequestCookiesProvider>
  );
}

async function CommentsSectionLoader({
  params,
}: Readonly<{ params: PostsPageParams }>) {
  const { postId } = await params;
  return <CommentsSection postId={postId} />;
}

async function FooterRecommendationsLoader({
  params,
}: Readonly<{ params: PostsPageParams }>) {
  const { postId } = await params;
  return <FooterRecommendations postId={postId} />;
}

export default function PostsPage({
  params,
}: Readonly<{ params: PostsPageParams }>) {
  return (
    <div data-component="PostsPage">
      <div className="px-4 sm:px-2 pt-12 sm:pt-20 md:pt-28 pb-16 bg-post-body-bg">
        <Suspense fallback={<PostDisplaySkeleton />}>
          <PostsDisplayLoader params={params} />
        </Suspense>
        <PostColumn>
          <Suspense fallback={<CommentsSectionSkeleton />}>
            <CommentsSectionLoader params={params} />
          </Suspense>
        </PostColumn>
      </div>
      <div className="w-full pt-16 pb-20 bg-post-footer-bg">
        <PostColumn>
          <div className="px-4 sm:px-2 md:px-0">
            <Suspense>
              <FooterRecommendationsLoader params={params} />
            </Suspense>
          </div>
        </PostColumn>
      </div>
    </div>
  );
}
