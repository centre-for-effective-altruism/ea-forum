import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import CommentBody from "../ContentStyles/CommentBody";

export default function BannerDescription({
  event: { frontpageDescriptionHtml, frontpageDescriptionMobileHtml },
}: Readonly<{
  event: ForumEventBase;
}>) {
  if (!frontpageDescriptionHtml && !frontpageDescriptionMobileHtml) {
    return null;
  }
  return (
    <div data-component="BannerDescription">
      <CommentBody html={frontpageDescriptionHtml} className="w-fit max-md:hidden" />
      <CommentBody
        html={frontpageDescriptionMobileHtml}
        className="w-fit md:hidden"
      />
    </div>
  );
}
