import type { ISidebarOpportunities } from "@/lib/posts/posts.queries";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { formatRelativeTime } from "@/lib/timeUtils";
import Type from "../Type";
import Link from "../Link";

export default function HomeSidebarPost({ post }: Readonly<{
  post: ISidebarOpportunities,
}>) {
  const {title, postedAt} = post;
  const pageUrl = postGetPageUrl({post});
  return (
    <Link
      href={pageUrl}
      className="block py-1 hover:opacity-70"
      data-component="HomeSidebarPost"
    >
      <Type style="bodySmall" className="font-[600] truncate">{title}</Type>
      <Type style="bodySmall" className="text-gray-600">
        Posted {formatRelativeTime(postedAt)}
      </Type>
    </Link>
  );
}
