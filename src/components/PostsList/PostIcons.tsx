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
      <Link
        href={href}
        openInNewTab={openInNewTab}
        className="text-gray-600 hover:text-gray-1000"
      >
        <Icon className={clsx("w-4", className)} />
      </Link>
    </Tooltip>
  );
};

export default function PostIcons({
  post,
  side,
  curatedIconLeft = false,
  className,
}: Readonly<{
  post: PostListItem;
  side: "left" | "right";
  curatedIconLeft?: boolean;
  className?: string;
}>) {
  const openThreadTagId = process.env.NEXT_PUBLIC_OPEN_THREAD_TAG_ID;
  const amaTagid = process.env.NEXT_PUBLIC_AMA_TAG_ID;
  const openThreadRelevance =
    post.tags?.find((tag) => tag._id === openThreadTagId)?.tagRel.baseScore ?? 0;
  const amaRelevance =
    post.tags?.find((tag) => tag._id === amaTagid)?.tagRel.baseScore ?? 0;

  const showPinned = side === "left" && post.sticky;
  const showOpenThread =
    side === "left" && !!openThreadTagId && openThreadRelevance >= 1;
  const showAma = side === "left" && !!amaTagid && amaRelevance >= 1;
  const showCurated =
    !!post.curatedDate && (side === "left" ? curatedIconLeft : !curatedIconLeft);
  const showQuestion = side === "right" && post.question;
  const linkUrl = side === "right" ? post.url : null;
  const showDialogue = side === "right" && post.collabEditorDialogue;
  const showPersonalBlogpost =
    side === "right" && !post.frontpageDate && !post.isEvent;

  const hasAny =
    showPinned ||
    showOpenThread ||
    showAma ||
    showCurated ||
    showQuestion ||
    !!linkUrl ||
    showDialogue ||
    showPersonalBlogpost;
  if (!hasAny) {
    return null;
  }

  return (
    <div
      data-component="PostIcons"
      className={clsx("inline-flex items-baseline gap-1", className)}
    >
      {showPinned && (
        <PostIcon
          href={postGetPageUrl({ post })}
          Icon={PinIcon}
          className="text-primary"
        >
          Pinned post
        </PostIcon>
      )}
      {showCurated && (
        <PostIcon
          href="/recommendations"
          Icon={StarIcon}
          className={side === "left" ? "text-curated-star" : undefined}
        >
          Curated
          <br />
          <em>(click to view all curated posts)</em>
        </PostIcon>
      )}
      {showQuestion && (
        <PostIcon href="/questions" Icon={QIcon}>
          Question
          <br />
          <em>(click to view all questions)</em>
        </PostIcon>
      )}
      {linkUrl && (
        <PostIcon href={linkUrl} openInNewTab Icon={LinkIcon}>
          Link post
          <br />
          <em>(click to see linked content)</em>
        </PostIcon>
      )}
      {showDialogue && (
        <PostIcon href={postGetPageUrl({ post })} Icon={ChatBubbleIcon}>
          Dialogue
        </PostIcon>
      )}
      {showPersonalBlogpost && (
        <PostIcon href={postGetPageUrl({ post })} Icon={UserIcon}>
          Personal blogpost
        </PostIcon>
      )}
      {showOpenThread && (
        <PostIcon href={postGetPageUrl({ post })} Icon={OpenThreadIcon}>
          Open thread
        </PostIcon>
      )}
      {showAma && (
        <PostIcon href={postGetPageUrl({ post })} Icon={ChatBubbleIcon}>
          Ask Me Anything thread
        </PostIcon>
      )}
    </div>
  );
}
