import type { Post } from "@/lib/schema";
import clsx from "clsx";
import Type from "../Type";
import Link from "../Link";

export default function LinkPostMessage({
  post,
  className,
}: Readonly<{
  post: Pick<Post, "url">;
  className?: string;
}>) {
  return post.url ? (
    <Type As="aside" className={clsx("bg-gray-100 rounded p-4", className)}>
      This is a linkpost for{" "}
      <Link href={post.url} className="text-primary hover:opacity-70" openInNewTab>
        {post.url}
      </Link>
    </Type>
  ) : null;
}
