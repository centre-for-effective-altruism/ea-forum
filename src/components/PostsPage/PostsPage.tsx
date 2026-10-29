import { Suspense } from "react";
import RequestCookiesProvider from "../Cookies/RequestCookiesProvider";
import CommentsSectionSkeleton from "../Comments/CommentsSectionSkeleton";
import FooterRecommendations from "./FooterRecommendations";
import CommentsSection from "../Comments/CommentsSection";
import PostDisplaySkeleton from "./PostDisplaySkeleton";
import PostsDisplay from "./PostsDisplay";
import PostColumn from "./PostColumn";

type PostsPageIds = Promise<{
  postId: string;
  sequenceId?: string;
}>;

async function PostsDisplayLoader({ ids }: Readonly<{ ids: PostsPageIds }>) {
  const { postId, sequenceId } = await ids;
  return (
    <RequestCookiesProvider>
      <PostsDisplay postId={postId} sequenceId={sequenceId} />
    </RequestCookiesProvider>
  );
}

async function CommentsSectionLoader({ ids }: Readonly<{ ids: PostsPageIds }>) {
  const { postId } = await ids;
  return <CommentsSection postId={postId} />;
}

async function FooterRecommendationsLoader({
  ids,
}: Readonly<{ ids: PostsPageIds }>) {
  const { postId } = await ids;
  return <FooterRecommendations postId={postId} />;
}

export default function PostsPage({ ids }: Readonly<{ ids: PostsPageIds }>) {
  return (
    <div data-component="PostsPage">
      <div className="px-4 sm:px-2 pt-12 sm:pt-20 md:pt-28 pb-16 bg-post-body-bg">
        <Suspense fallback={<PostDisplaySkeleton />}>
          <PostsDisplayLoader ids={ids} />
        </Suspense>
        <PostColumn>
          <Suspense fallback={<CommentsSectionSkeleton />}>
            <CommentsSectionLoader ids={ids} />
          </Suspense>
        </PostColumn>
      </div>
      <div className="w-full pt-16 pb-20 bg-post-footer-bg">
        <PostColumn>
          <div className="px-4 sm:px-2 md:px-0">
            <Suspense>
              <FooterRecommendationsLoader ids={ids} />
            </Suspense>
          </div>
        </PostColumn>
      </div>
    </div>
  );
}
