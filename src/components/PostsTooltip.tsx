import type { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { PostListItem } from "@/lib/posts/postLists";
import {
  getPostSocialImageUrl,
  PostWithSocialPreview,
} from "@/lib/posts/postsHelpers";
import Image from "next/image";
import PostBody from "./ContentStyles/PostBody";
import TruncationContainer from "./TruncationContainer";
import TagChip from "./Tags/TagChip";
import Tooltip from "./Tooltip";
import Type from "./Type";

type PostForTooltip = PostWithSocialPreview &
  Pick<PostListItem, "_id" | "title" | "contents" | "tags">;

export default function PostsTooltip({
  post,
  placement = "bottom-start",
  As = "div",
  children,
}: Readonly<{
  post: PostForTooltip | null | undefined;
  placement?: Placement;
  As?: ElementType;
  children: ReactNode;
}>) {
  if (!post) {
    return <>{children}</>;
  }
  const { title, tags, contents } = post;
  const imageUrl = getPostSocialImageUrl(post);
  const htmlHighlight = contents?.htmlHighlight as string | undefined;
  return (
    <Tooltip
      placement={placement}
      As={As}
      tooltipClassName="bg-white! text-black! p-0! shadow-md w-[330px]"
      title={
        <div data-component="PostsTooltip">
          <div className="p-2">
            <Type style="postTitle">{title}</Type>
            <TruncationContainer
              items={tags.map((tag) => (
                <TagChip tag={tag} key={tag._id} />
              ))}
              gap={4}
              className="flex flex-wrap items-center gap-1 w-full overflow-hidden"
            />
            {htmlHighlight && <PostBody html={htmlHighlight} />}
          </div>
          {imageUrl && (
            <div className="relative w-[330px] h-[120px] min-h-[60px]">
              <Image src={imageUrl} alt={title} fill />
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
