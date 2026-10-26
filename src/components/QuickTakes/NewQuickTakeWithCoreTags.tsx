import { fetchCoreTags } from "@/lib/tags/tagQueries";
import NewQuickTake from "./NewQuickTake";

export default async function NewQuickTakeWithCoreTags({
  className,
}: Readonly<{
  className?: string;
}>) {
  const coreTags = await fetchCoreTags();
  return <NewQuickTake coreTags={coreTags} className={className} />;
}
