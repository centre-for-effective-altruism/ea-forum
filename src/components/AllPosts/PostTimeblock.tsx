import {
  AllPostsTimeblockSettings,
  getTimeblockTitle,
} from "@/lib/posts/allPostsSettings";
import Type from "../Type";

export default function PostTimeblock({
  settings,
  after,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
  before: Date;
  after: Date;
}>) {
  return (
    <section data-component="PostTimeblock">
      <Type style="sectionTitleLarge" className="max-md:hidden">
        {getTimeblockTitle(settings.timeframe, after, "desktop")}
      </Type>
      <Type style="sectionTitleLarge" className="md:hidden">
        {getTimeblockTitle(settings.timeframe, after, "mobile")}
      </Type>
    </section>
  );
}
