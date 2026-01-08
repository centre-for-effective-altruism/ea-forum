import { fetchCoreTags } from "@/lib/tags/tagQueries";
import HomePageTagBarDisplay from "./HomePageTagBarDisplay";

export default async function HomePageTagBar({
  className,
}: Readonly<{
  className?: string;
}>) {
  const coreTags = await fetchCoreTags();
  return <HomePageTagBarDisplay coreTags={coreTags} className={className} />;
}
