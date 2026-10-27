import type { Metadata } from "next";
import type { CurrentUser } from "../users/currentUser";
import { getSiteOgImageUrl } from "../cloudinary/cloudinaryHelpers";
import { htmlToTextDefault } from "../utils/htmlToText";
import { isNoIndexSite } from "../environment";
import { fetchTopicPageCached } from "./tagPageQueries";
import { tagGetPageUrl } from "./tagHelpers";

const MAX_DESCRIPTION_LENGTH = 300;

export const generateTopicPageMetadata = async (
  currentUser: CurrentUser | null,
  slug: string,
): Promise<Metadata> => {
  const tag = await fetchTopicPageCached(currentUser, slug);
  if (!tag) {
    return {
      title: "Topic not found",
    };
  }
  const canonicalUrl = tagGetPageUrl({ tag, isAbsolute: true });
  const plaintext = htmlToTextDefault(tag.descriptionHtml ?? "").trim();
  const description = plaintext
    ? plaintext.slice(0, MAX_DESCRIPTION_LENGTH)
    : `All posts related to ${tag.name}`;
  const imageUrl = getSiteOgImageUrl();
  return {
    title: tag.name,
    description,
    robots: tag.noindex || tag.deleted || isNoIndexSite ? "noindex" : undefined,
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: tag.name,
      description,
      images: imageUrl,
    },
    twitter: {
      description,
      images: imageUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
};
