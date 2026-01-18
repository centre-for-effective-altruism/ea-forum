import type { ComponentType, FC, ReactNode } from "react";
import type { PostListItem } from "@/lib/posts/postLists";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import ChatBubbleIcon from "@heroicons/react/24/outline/ChatBubbleLeftRightIcon";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import LinkIcon from "@heroicons/react/20/solid/LinkIcon";
import UserIcon from "@heroicons/react/24/solid/UserIcon";
import OpenThreadIcon from "../Icons/OpenThreadIcon";
import PinIcon from "../Icons/PinIcon";
import QIcon from "../Icons/QIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

const PostIcon: FC<{
  href: string;
  openInNewTab?: boolean;
  Icon: ComponentType<{ className?: string }>;
  className?: string;
  children: ReactNode;
}> = ({ href, openInNewTab, Icon, className, children }) => {
  return (
    <Tooltip
      placement="bottom-start"
      title={<Type style="bodySmall">{children}</Type>}
    >
      <Link href={href} openInNewTab={openInNewTab} className="text-gray-600">
        <Icon className={clsx("w-4 mr-1", className)} />
      </Link>
    </Tooltip>
  );
};

export default function PostIcons({
  post,
}: Readonly<{
  post: PostListItem;
}>) {
  const openThreadTagId = process.env.NEXT_PUBLIC_OPEN_THREAD_TAG_ID;
  const amaTagid = process.env.NEXT_PUBLIC_AMA_TAG_ID;
  const openThreadRelevance =
    post.tags.find((tag) => tag._id === openThreadTagId)?.baseScore ?? 0;
  const amaRelevance = post.tags.find((tag) => tag._id === amaTagid)?.baseScore ?? 0;
  return (
    <div data-component="PostIcons" className="flex items-center">
      {post.sticky && (
        <PostIcon
          href={postGetPageUrl({ post })}
          Icon={PinIcon}
          className="text-primary"
        >
          Pinned post
        </PostIcon>
      )}
      {post.curatedDate && (
        <PostIcon
          href="/recommendations"
          Icon={StarIcon}
          className="text-curated-star"
        >
          Curated
          <br />
          <em>(click to view all curated posts)</em>
        </PostIcon>
      )}
      {post.question && (
        <PostIcon href="/questions" Icon={QIcon}>
          Question
          <br />
          <em>(click to view all questions)</em>
        </PostIcon>
      )}
      {post.url && (
        <PostIcon href={post.url} openInNewTab Icon={LinkIcon}>
          Link post
          <br />
          <em>(click to see linked content)</em>
        </PostIcon>
      )}
      {post.collabEditorDialogue && (
        <PostIcon href={postGetPageUrl({ post })} Icon={ChatBubbleIcon}>
          Dialogue
        </PostIcon>
      )}
      {!post.frontpageDate && !post.isEvent && (
        <PostIcon href={postGetPageUrl({ post })} Icon={UserIcon}>
          Personal blogpost
        </PostIcon>
      )}
      {openThreadTagId && openThreadRelevance >= 1 && (
        <PostIcon href={postGetPageUrl({ post })} Icon={OpenThreadIcon}>
          Open thread
        </PostIcon>
      )}
      {amaTagid && amaRelevance >= 1 && (
        <PostIcon href={postGetPageUrl({ post })} Icon={ChatBubbleIcon}>
          Ask Me Anything thread
        </PostIcon>
      )}
    </div>
  );
}
