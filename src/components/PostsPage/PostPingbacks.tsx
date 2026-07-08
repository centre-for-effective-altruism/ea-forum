import type { CurrentUser } from "@/lib/users/currentUser";
import { fetchPingbackPosts } from "@/lib/posts/postLists";
import PostPingbacksList from "./PostPingbacksList";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default async function PostPingbacks({
  postId,
  currentUser,
  className,
}: Readonly<{
  postId: string;
  currentUser: CurrentUser | null;
  className?: string;
}>) {
  const pingbacks = await fetchPingbackPosts(currentUser?._id ?? null, postId);
  if (!pingbacks.length) {
    return null;
  }
  return (
    <section data-component="PostPingbacks" id="mentioned-in" className={className}>
      <Type style="bodyMedium" className="cursor-default">
        <Tooltip
          title={<Type style="bodySmall">Posts that linked to this post</Type>}
          placement="top"
          className="inline-block mb-2"
        >
          Mentioned in
        </Tooltip>
      </Type>
      <PostPingbacksList pingbacks={pingbacks} />
    </section>
  );
}
