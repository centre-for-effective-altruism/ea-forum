import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCachedSequencePage } from "@/lib/sequences/sequenceQueries";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import {
  getSiteOgImageUrl,
  makeCloudinaryImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import { isNoIndexSite } from "@/lib/environment";
import SequencePageSkeleton from "@/components/Sequences/SequencePageSkeleton";
import SequencePageLoader from "@/components/Sequences/SequencePageLoader";

const MAX_DESCRIPTION_LENGTH = 300;

type SequencePageProps = {
  params: Promise<{ sequenceId: string }>;
};

export async function generateMetadata({
  params,
}: SequencePageProps): Promise<Metadata> {
  const [currentUser, { sequenceId }] = await Promise.all([
    getCurrentUser(),
    params,
  ]);
  const sequence = await fetchCachedSequencePage(currentUser, sequenceId);
  if (!sequence) {
    return {
      title: "Sequence not found",
    };
  }
  const canonicalUrl = sequenceGetPageUrl({ sequence, isAbsolute: true });
  const description =
    htmlToTextDefault(sequence.html ?? "")
      .trim()
      .slice(0, MAX_DESCRIPTION_LENGTH) || undefined;
  const imageId = sequence.gridImageId || sequence.bannerImageId;
  const imageUrl = imageId
    ? makeCloudinaryImageUrl(imageId, {
        c: "fill",
        dpr: "auto",
        q: "auto",
        f: "auto",
        g: "auto:faces",
      })
    : getSiteOgImageUrl();
  return {
    title: sequence.title,
    description,
    robots: sequence.noindex || isNoIndexSite ? "noindex" : undefined,
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: sequence.title,
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

async function SequencePageContent({ params }: SequencePageProps) {
  const { sequenceId } = await params;
  return <SequencePageLoader sequenceId={sequenceId} />;
}

export default function SequencePage({ params }: SequencePageProps) {
  return (
    <AnalyticsContext pageContext="sequencesPage">
      <Suspense fallback={<SequencePageSkeleton />}>
        <SequencePageContent params={params} />
      </Suspense>
    </AnalyticsContext>
  );
}
