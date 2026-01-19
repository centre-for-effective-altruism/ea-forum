import type { Post } from "@/lib/schema";
import Type from "../Type";
import Link from "../Link";

export default function LinkPostMessage({
  post,
}: Readonly<{
  post: Pick<Post, "url">;
}>) {
  return post.url ? (
    <Type As="aside" className="bg-gray-100 rounded p-4">
      This is a linkpost for{" "}
      <Link href={post.url} className="text-primary hover:opacity-70" openInNewTab>
        {post.url}
      </Link>
    </Type>
  ) : null;
}
