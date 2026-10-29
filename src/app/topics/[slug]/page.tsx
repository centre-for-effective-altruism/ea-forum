import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { generateTopicPageMetadata } from "@/lib/tags/topicPageMetadata";
import TopicPageSkeleton from "@/components/Topics/TopicPageSkeleton";
import TopicPageLoader from "@/components/Topics/TopicPageLoader";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const [currentUser, { slug }] = await Promise.all([getCurrentUser(), params]);
  return generateTopicPageMetadata(currentUser, slug);
}

async function TopicPageContent({ params, searchParams }: TopicPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!slug) {
    notFound();
  }
  const sortedByQuery =
    typeof query.sortedBy === "string" ? query.sortedBy : undefined;
  return <TopicPageLoader slug={slug} sortedByQuery={sortedByQuery} />;
}

export default function TopicPage({ params, searchParams }: TopicPageProps) {
  return (
    <AnalyticsContext pageContext="tagPage">
      <Suspense fallback={<TopicPageSkeleton />}>
        <TopicPageContent params={params} searchParams={searchParams} />
      </Suspense>
    </AnalyticsContext>
  );
}
