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
      tooltipClassName="
        bg-gray-0! text-gray-900! p-0! shadow-md w-[360px] max-w-full
      "
      title={
        <div data-component="PostsTooltip">
          <div className="px-4 py-3 flex flex-col gap-4">
            <Type style="postTitle" className="font-[700]">
              {title}
            </Type>
            {tags && tags.length > 0 && (
              <TruncationContainer
                items={tags.map((tag) => (
                  <TagChip tag={tag} key={tag._id} />
                ))}
                gap={4}
                className="flex flex-wrap items-center w-full overflow-hidden"
              />
            )}
            {htmlHighlight && (
              <PostBody
                html={htmlHighlight}
                className="
                  [&_p]:text-[14px]! [&_li]:text-[14px]!
                  [&_h1]:text-[14px]! [&_h1]:font-[700]!
                  [&_h2]:text-[14px]! [&_h2]:font-[700]!
                  [&_h3]:text-[14px]! [&_h3]:font-[700]!
                  [&_h4]:text-[14px]! [&_h4]:font-[700]!
                  [&_h5]:text-[14px]! [&_h5]:font-[700]!
                  [&_h6]:text-[14px]! [&_h6]:font-[700]!
                  [&_iframe]:hidden! [&_img]:hidden! [&_video]:hidden!
                "
              />
            )}
          </div>
          {imageUrl && (
            <div className="relative w-full h-[120px] min-h-[60px]">
              <Image src={imageUrl} alt={title} fill className="object-cover" />
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
