import { notFound, permanentRedirect } from "next/navigation";
import { sequenceGetEditUrl } from "@/lib/sequences/sequenceHelpers";
import { db } from "@/lib/db";

export const instant = false;

export default async function ChaptersEditRedirect({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  const chapter = await db.query.chapters.findFirst({
    columns: {
      sequenceId: true,
    },
    where: {
      _id,
    },
  });
  if (!chapter?.sequenceId) {
    notFound();
  }
  permanentRedirect(sequenceGetEditUrl(chapter.sequenceId));
}
