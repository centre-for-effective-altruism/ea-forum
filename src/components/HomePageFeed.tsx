import type { ReactNode } from "react";
import type { CoreTag } from "@/lib/tags/tagQueries";
import HomePageTagBar from "./HomePageTagBar";

export default function HomePageFeed({
  defaultFeed,
  coreTags,
}: Readonly<{
  defaultFeed: ReactNode;
  coreTags: CoreTag[];
}>) {
  return (
    <>
      <HomePageTagBar coreTags={coreTags} className="mb-4" />
      {defaultFeed}
    </>
  );
}
