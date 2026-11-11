import { notFound, redirect } from "next/navigation";
import { fetchCurrentOpenThread } from "@/lib/posts/postLists";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";

export const instant = false;

export default async function OpenThreadRedirect() {
  const post = await fetchCurrentOpenThread();
  if (!post) {
    notFound();
  }
  redirect(postGetPageUrl({ post }));
}
