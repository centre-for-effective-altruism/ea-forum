import { fetchCommunitySequences } from "@/lib/sequences/sequenceQueries";
import ClientCommunitySequencesList from "./ClientCommunitySequencesList";

export default async function CommunitySequencesList({
  initialLimit,
}: Readonly<{
  initialLimit: number;
}>) {
  const sequences = await fetchCommunitySequences({ limit: initialLimit });
  return <ClientCommunitySequencesList sequences={sequences} />;
}
