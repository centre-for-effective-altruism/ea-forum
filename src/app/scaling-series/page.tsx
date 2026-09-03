import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchEditorialPageContent } from "@/lib/sequences/editorialPageContentQueries";
import {
  editorialPageMetadata,
  scalingSeriesPage,
} from "@/lib/sequences/editorialPages";
import EditorialPageDisplay from "@/components/EditorialPage/EditorialPageDisplay";

export const metadata: Metadata = editorialPageMetadata(scalingSeriesPage);

export default async function ScalingSeriesPage() {
  const currentUser = await getCurrentUser();
  const content = await fetchEditorialPageContent({
    currentUser,
    config: scalingSeriesPage,
  });
  if (!content) {
    notFound();
  }
  return <EditorialPageDisplay config={scalingSeriesPage} {...content} />;
}
