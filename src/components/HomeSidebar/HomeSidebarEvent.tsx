import type { ISidebarEvents } from "@/lib/posts/postQueries.queries";
import { getEventLocation, postGetPageUrl } from "@/lib/posts/postsHelpers";
import { formatShortDate } from "@/lib/timeUtils";
import Type from "../Type";
import Link from "../Link";

export default function HomeSidebarEvent({
  post,
}: Readonly<{
  post: ISidebarEvents;
}>) {
  const { title, startTime } = post;
  const pageUrl = postGetPageUrl({ post });
  return (
    <Link
      href={pageUrl}
      className="block py-1 hover:opacity-70"
      data-component="HomeSidebarPost"
    >
      <Type style="bodySmall" className="font-[600] truncate">
        {title}
      </Type>
      <Type style="bodySmall" className="text-gray-600">
        <span className="mr-2">{startTime && formatShortDate(startTime)}</span>
        {getEventLocation(post)}
      </Type>
    </Link>
  );
}
