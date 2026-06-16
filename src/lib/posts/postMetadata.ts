import type { Metadata } from "next";
import type { CurrentUser } from "../users/currentUser";
import { getSiteOgImageUrl } from "../cloudinary/cloudinaryHelpers";
import { fetchPostDisplayCached } from "./postQueries";
import { filterNonNull } from "../typeHelpers";
import {
  getPostDescription,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "./postsHelpers";

export const generatePostMetadata = async (
  currentUser: CurrentUser | null,
  postId: string,
): Promise<Metadata> => {
  const post = await fetchPostDisplayCached(currentUser, postId);
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
};
