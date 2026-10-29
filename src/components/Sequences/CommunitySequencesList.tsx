import { cacheLife } from "next/cache";
import { fetchCommunitySequences } from "@/lib/sequences/sequenceQueries";
import ClientCommunitySequencesList from "./ClientCommunitySequencesList";

// Sequences are edited on the legacy site, so we can't invalidate this when they
// change, and cache it for a short time instead
const fetchInitialCommunitySequences = async (limit: number) => {
  "use cache";
  cacheLife("minutes");
  return fetchCommunitySequences({ limit });
};

export default async function CommunitySequencesList({
  initialLimit,
}: Readonly<{
  initialLimit: number;
}>) {
  const sequences = await fetchInitialCommunitySequences(initialLimit);
  return <ClientCommunitySequencesList sequences={sequences} />;
}
