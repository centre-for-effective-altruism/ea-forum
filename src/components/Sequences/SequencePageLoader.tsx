import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCachedSequencePage } from "@/lib/sequences/sequenceQueries";
import SequencePage from "./SequencePage";

export default async function SequencePageLoader({
  sequenceId,
}: Readonly<{
  sequenceId: string;
}>) {
  const currentUser = await getCurrentUser();
  const sequence = await fetchCachedSequencePage(currentUser, sequenceId);
  if (!sequence) {
    notFound();
  }
  return <SequencePage sequence={sequence} currentUser={currentUser} />;
}
