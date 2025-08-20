import { FC, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { IFrontpagePostsList } from "@/lib/posts/postQueries.schemas";
import { getPostById } from "@/lib/posts/postsApi";
import {
  getPostSocialImageUrl,
  PostWithSocialPreview,
} from "@/lib/posts/postsHelpers";
import Image from "next/image";
import PostBody from "./PostBody";
import Tooltip from "./Tooltip";
import Type from "./Type";

type PostForTooltip = Pick<IFrontpagePostsList, "title" | "htmlHighlight"> &
  PostWithSocialPreview;

const PostsTooltipLoading: FC = () => {
  return (
    <div data-component="PostsTooltip">
      <div className="p-2">
        <div className="w-full h-4 min-h-4 bg-gray-200 rounded my-1" />
        <div className="w-full h-4 min-h-4 bg-gray-200 rounded my-1" />
        <PostBody html="" />
      </div>
      <div className="relative w-[330px] h-[120px] min-h-[120px] bg-gray-100" />
    </div>
  );
};

const PostsTooltipWrapper: FC<{
  post?: PostForTooltip | null;
  postId?: string | null;
}> = ({ post, postId }) => {
  const { data: fetchedPost, loading } = getPostById.use({
    params: { _id: postId! },
    skip: !!post || !postId,
  });

  if (loading) {
    return <PostsTooltipLoading />;
  }

  const postToDisplay = post ?? fetchedPost?.post;
  if (!postToDisplay) {
    return null;
  }

  const { title, htmlHighlight } = postToDisplay;
  const imageUrl = getPostSocialImageUrl(postToDisplay);
  return (
    <div data-component="PostsTooltip">
      <div className="p-2">
        <Type style="postTitle">{title}</Type>
        <PostBody html={htmlHighlight} />
      </div>
      {imageUrl && (
        <div className="relative w-[330px] h-[120px] min-h-[60px]">
          <Image src={imageUrl} alt={title} fill />
        </div>
      )}
    </div>
  );
};

export default function PostsTooltip({
  post,
  postId,
  placement = "bottom-start",
  children,
}: Readonly<{
  post?: PostForTooltip | null;
  postId?: string | null;
  placement?: Placement;
  children: ReactNode;
}>) {
  return (
    <Tooltip
      placement={placement}
      tooltipClassName="bg-white! text-black! p-0! shadow-md w-[330px]"
      title={<PostsTooltipWrapper post={post} postId={postId} />}
    >
      {children}
    </Tooltip>
  );
}
