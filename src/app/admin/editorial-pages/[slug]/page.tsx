import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchEditorialPageBySlug } from "@/lib/sequences/editorialPageQueries";
import EditEditorialPage from "@/components/Admin/EditEditorialPage";
import AdminEditorialPageColumn from "../AdminEditorialPageColumn";

export const metadata: Metadata = {
  title: "Edit editorial page",
};

export default async function EditEditorialPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await fetchEditorialPageBySlug(slug);
  if (!page) {
    notFound();
  }
  return (
    <AdminEditorialPageColumn>
      <EditEditorialPage page={page} previousSlug={page.slug} />
    </AdminEditorialPageColumn>
  );
}
