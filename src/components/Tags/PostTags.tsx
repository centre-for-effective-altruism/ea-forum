"use client";

import { useCallback, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { DropdownDismissRef } from "../Dropdown/Dropdown";
import { stableSortTags } from "@/lib/tags/tagHelpers";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import toast from "react-hot-toast";
import TruncationContainer from "../TruncationContainer";
import PostTypeTag from "./PostTypeTag";
import TagChip from "../Tags/TagChip";
import TagSelect from "./TagSelect";
import Type from "../Type";

export default function PostTags({
  post,
  className,
}: Readonly<{
  post: PostDisplay;
  className?: string;
}>) {
  const { captureEvent } = useTracking();
  const [tags, setTags] = useState(post.tags ? stableSortTags(post.tags) : []);
  const dismissRef: DropdownDismissRef = useRef(null);

  const onClickButton = useCallback(() => {
    captureEvent("addTagClicked");
  }, [captureEvent]);

  const onSelectTag = useCallback(
    async (tag: { _id: string; name: string }) => {
      dismissRef.current?.();
      const toastId = toast.loading(`Adding topic "${tag.name}"...`);
      try {
        const updatedTags = await rpc.tags.addOrUpvoteTag({
          postId: post._id,
          tagId: tag._id,
        });
        setTags(updatedTags);
        toast.success(`Added "${tag.name}"`);
      } catch (e) {
        console.error(e);
        const message = (e as Error).message ?? "Something went wrong";
        toast.error(message);
        captureException(e);
      }
      toast.remove(toastId);
    },
    [post],
  );

  return (
    <TruncationContainer
      items={[
        ...tags.map((tag) => <TagChip tag={tag} key={tag._id} />),
        <PostTypeTag key="typetag" post={post} />,
        <TagSelect
          key="addtag"
          placement="bottom-start"
          onSelect={onSelectTag}
          dismissRef={dismissRef}
        >
          <Type
            As="button"
            style="bodySmall"
            className="cursor-pointer px-2 py-1 hover:bg-gray-600/10 rounded"
            onClick={onClickButton}
          >
            + Add topic
          </Type>
        </TagSelect>,
      ]}
      gap={4}
      canShowMore
      className={clsx(
        "flex flex-wrap items-center gap-1 w-full overflow-hidden",
        className,
      )}
    />
  );
}
