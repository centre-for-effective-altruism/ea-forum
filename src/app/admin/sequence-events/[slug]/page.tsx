import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchSequenceEventPageBySlug } from "@/lib/sequences/sequenceEventPageQueries";
import { newSequenceEventPage } from "@/lib/sequences/sequenceEvents";
import EditSequenceEventPage from "@/components/Admin/EditSequenceEventPage";

export const metadata: Metadata = {
  title: "Edit series page",
};

export default async function EditSequenceEventRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const isNew = slug === "new";
  const page = isNew
    ? newSequenceEventPage()
    : await fetchSequenceEventPageBySlug(slug);
  if (!page) {
    notFound();
  }
  return (
    <div
      data-component="EditSequenceEventRoute"
      className="w-[716px] max-w-full mx-auto my-10 px-2"
    >
      <EditSequenceEventPage page={page} isNew={isNew} />
    </div>
  );
}
