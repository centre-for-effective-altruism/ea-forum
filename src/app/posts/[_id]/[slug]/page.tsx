import { Suspense } from "react";
import type { Metadata } from "next";
import { filterNonNull } from "@/lib/typeHelpers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchPostDisplayCached } from "@/lib/posts/postQueries";
import { getSiteOgImageUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import {
  getPostDescription,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import PostsDisplay from "@/components/PostsPage/PostsDisplay";
import PostDisplaySkeleton from "@/components/PostsPage/PostDisplaySkeleton";
import FooterRecommendations from "@/components/PostsPage/FooterRecommendations";
import CommentsSectionSkeleton from "@/components/Comments/CommentsSectionSkeleton";
import CommentsSection from "@/components/Comments/CommentsSection";
import PostColumn from "@/components/PostsPage/PostColumn";

type PostsPageProps = {
  params: Promise<{ _id: string }>;
};

export async function generateMetadata({
  params,
}: PostsPageProps): Promise<Metadata> {
  const [currentUser, { _id }] = await Promise.all([getCurrentUser(), params]);
  const post = await fetchPostDisplayCached(currentUser, _id);
  if (!post) {
    return {};
  }
  const canonicalUrl = postGetPageUrl({ post, isAbsolute: true });
  const description = getPostDescription(post);
  const imageUrl = getPostSocialImageUrl(post) || getSiteOgImageUrl();
  const authors = filterNonNull([
    post.user?.displayName,
    ...(post.coauthors ?? []).map((coauthor) => coauthor.displayName),
  ]);
  const citationDate = post.postedAt
    ? post.postedAt.slice(0, post.postedAt.indexOf("T")).replace(/-/g, "/")
    : "";
  return {
    title: post.title,
    description,
    authors: authors.map((name) => ({ name })),
    robots: post.noIndex ? "noindex" : undefined,
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: post.title,
      description,
      images: imageUrl,
    },
    twitter: {
      description,
      images: imageUrl,
    },
    other: {
      citation_title: post.title,
      citation_author: authors,
      citation_publication_date: citationDate,
    },
  };
}

export default async function PostsPage({ params }: PostsPageProps) {
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
      <div className="w-full bg-background pt-15 pb-20">
        <PostColumn>
          <Suspense>
            <FooterRecommendations postId={_id} />
          </Suspense>
        </PostColumn>
      </div>
    </div>
  );
}
