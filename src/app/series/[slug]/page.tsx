import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchSequenceEvent } from "@/lib/sequences/sequenceEventQueries";
import { fetchSequenceEventPageBySlug } from "@/lib/sequences/sequenceEventPageQueries";
import {
  sequenceEventConfigFromPage,
  sequenceEventMetadata,
} from "@/lib/sequences/sequenceEvents";
import SequenceEventPage from "@/components/SequenceEventPage/SequenceEventPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchSequenceEventPageBySlug(slug);
  if (!page) {
    return {};
  }
  return {
    ...sequenceEventMetadata(sequenceEventConfigFromPage(page)),
    robots: page.published ? undefined : "noindex",
  };
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const [currentUser, page] = await Promise.all([
    getCurrentUser(),
    fetchSequenceEventPageBySlug(slug),
  ]);
  // Unpublished pages are visible to admins so that they can be checked before
  // being shown to everybody else
  if (!page || (!page.published && !currentUser?.isAdmin)) {
    notFound();
  }
  const config = sequenceEventConfigFromPage(page);
  const data = await fetchSequenceEvent({ currentUser, config });
  if (!data) {
    notFound();
  }
  return <SequenceEventPage config={config} {...data} />;
}
