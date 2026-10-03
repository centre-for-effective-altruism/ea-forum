import { fetchCoreTags } from "@/lib/tags/tagQueries";
import TruncatedTagsList from "./TruncatedTagsList";

export default async function CoreTagsList({
  initialCount,
}: Readonly<{
  initialCount: number;
}>) {
  const coreTags = await fetchCoreTags();
  return <TruncatedTagsList tags={coreTags} initialCount={initialCount} />;
}
