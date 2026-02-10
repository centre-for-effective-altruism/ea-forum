import type { PostDisplay } from "@/lib/posts/postQueries";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import ShareButton from "../ShareButton";

export default function PostShareButton({
  post,
}: Readonly<{
  post: PostDisplay;
}>) {
  return (
    <ShareButton
      title={post.title}
      url={postGetPageUrl({ post, isAbsolute: true })}
      clickEventName="sharePostButtonClicked"
      shareEventName="sharePost"
      campaign="post_share"
    />
  );
}
