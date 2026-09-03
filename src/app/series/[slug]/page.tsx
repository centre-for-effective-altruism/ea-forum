import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchEditorialPageContent } from "@/lib/sequences/editorialPageContentQueries";
import { fetchEditorialPageBySlug } from "@/lib/sequences/editorialPageQueries";
import {
  editorialPageConfig,
  editorialPageMetadata,
} from "@/lib/sequences/editorialPages";
import EditorialPageDisplay from "@/components/EditorialPage/EditorialPageDisplay";

/**
 * Admin-created editorial pages. Readers reach these at `/<slug>`, which the
 * proxy rewrites here — see `@/lib/proxy/legacySiteRedirect`. Admins also use
 * this path directly to check a page before it's published.
 */
type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchEditorialPageBySlug(slug);
  if (!page) {
    return {};
  }
  return {
    ...editorialPageMetadata(editorialPageConfig(page)),
    robots: page.published ? undefined : "noindex",
  };
}

export default async function EditorialPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const [currentUser, page] = await Promise.all([
    getCurrentUser(),
    fetchEditorialPageBySlug(slug),
  ]);
  // Unpublished pages are visible to admins so that they can be checked before
  // being shown to everybody else
  if (!page || (!page.published && !currentUser?.isAdmin)) {
    notFound();
  }
  const config = editorialPageConfig(page);
  const content = await fetchEditorialPageContent({ currentUser, config });
  if (!content) {
    notFound();
  }
  return <EditorialPageDisplay config={config} {...content} />;
}
