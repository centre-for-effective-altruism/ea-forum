import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchSequenceEditPage } from "@/lib/sequences/sequenceQueries";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import { userIsAdmin, userIsAdminOrMod } from "@/lib/users/userHelpers";
import SequenceDetailsForm from "./SequenceDetailsForm";
import DeleteSequenceSection from "./DeleteSequenceSection";
import ChaptersEditor from "./ChaptersEditor";
import Link from "../Link";
import Type from "../Type";

export default async function SequenceEditPageContent({
  params,
}: Readonly<{
  params: Promise<{ sequenceId: string }>;
}>) {
  const [currentUser, { sequenceId }] = await Promise.all([
    getCurrentUser(),
    params,
  ]);
  if (!currentUser) {
    return (
      <Type className="text-gray-600">Please log in to edit this sequence.</Type>
    );
  }
  const data = await fetchSequenceEditPage(currentUser, sequenceId);
  if (!data) {
    notFound();
  }
  const { sequence, chapters } = data;
  return (
    <>
      <div className="flex flex-col gap-2">
        <Type style="bodySmall" className="text-gray-600">
          <Link
            href={sequenceGetPageUrl({ sequence })}
            className="hover:text-primary"
          >
            ← Back to sequence
          </Link>
        </Type>
        <Type style="postsPageTitle">Edit sequence</Type>
      </div>
      <SequenceDetailsForm
        sequence={sequence}
        canEditModeratorFields={userIsAdminOrMod(currentUser)}
        canEditAdminFields={userIsAdmin(currentUser)}
      />
      <ChaptersEditor
        sequenceId={sequence._id}
        chapters={chapters}
        canEditAdminFields={userIsAdmin(currentUser)}
      />
      <DeleteSequenceSection sequenceId={sequence._id} />
    </>
  );
}
