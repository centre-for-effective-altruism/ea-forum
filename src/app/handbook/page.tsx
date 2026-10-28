import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchHandbookPage } from "@/lib/collections/handbookQueries";
import {
  getSiteOgImageUrl,
  makeCloudinaryImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import { isNoIndexSite } from "@/lib/environment";
import { getSiteUrl } from "@/lib/routeHelpers";
import HandbookPageSkeleton from "@/components/Collections/HandbookPageSkeleton";
import HandbookPageLoader from "@/components/Collections/HandbookPageLoader";

const TITLE = "The Effective Altruism Handbook";
const MAX_DESCRIPTION_LENGTH = 300;

export async function generateMetadata(): Promise<Metadata> {
  const currentUser = await getCurrentUser();
  const data = await fetchHandbookPage(currentUser);
  if (!data) {
    return {
      title: "Handbook not found",
    };
  }
  const { collection } = data;
  const canonicalUrl = `${getSiteUrl()}handbook`;
  const description =
    htmlToTextDefault(collection.html ?? "")
      .trim()
      .slice(0, MAX_DESCRIPTION_LENGTH) || undefined;
  const imageUrl = collection.gridImageId
    ? makeCloudinaryImageUrl(collection.gridImageId, {
        c: "fill",
        dpr: "auto",
        q: "auto",
        f: "auto",
        g: "auto:faces",
      })
    : getSiteOgImageUrl();
  return {
    title: TITLE,
    description,
    robots: collection.noindex || isNoIndexSite ? "noindex" : undefined,
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: TITLE,
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
}

export default function HandbookPage() {
  return (
    <AnalyticsContext pageContext="handbook">
      <Suspense fallback={<HandbookPageSkeleton />}>
        <HandbookPageLoader />
      </Suspense>
    </AnalyticsContext>
  );
}
