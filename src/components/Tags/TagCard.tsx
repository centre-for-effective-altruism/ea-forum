"use client";

import { useCallback } from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import BellSolidIcon from "@heroicons/react/24/solid/BellIcon";
import BellOutlineIcon from "@heroicons/react/24/outline/BellIcon";
import CloudinaryImage from "../CloudinaryImage";
import TagTooltip from "../TagTooltip";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

export default function TagCard({
  tag,
}: Readonly<{
  tag: TagBase;
}>) {
  const { data, update, loading } = useSubscription({
    collectionName: "Tags",
    documentId: tag._id,
    type: "newTagPosts",
  });
  const toggleSubscribed = useCallback(() => {
    if (!loading && data) {
      update(!data.subscribed);
    }
  }, [loading, data, update]);
  return (
    <article data-component="TagCard" className="rounded bg-gray-0 p-4 flex gap-4">
      {tag.imageId ? (
        <CloudinaryImage
          publicId={tag.imageId}
          width={85}
          height={85}
          objectFit="cover"
          className="rounded"
        />
      ) : (
        <div className="min-w-[85px] bg-gray-300 rounded" />
      )}
      <div className="flex flex-col">
        <TagTooltip tag={tag}>
          <Type style="bodyLarge" className="!font-[600]">
            <Link href={tagGetPageUrl({ tag })}>{tag.name}</Link>
          </Type>
        </TagTooltip>
        <Type style="bodySmall" className="text-gray-600 grow">
          {tag.postCount} post{tag.postCount === 1 ? "" : "s"}
        </Type>
        <div>
          <Button
            onClick={toggleSubscribed}
            loading={loading}
            className="!py-1 flex items-center gap-1.5"
          >
            {data?.subscribed ? (
              <>
                <BellSolidIcon className="w-4" />
                Unsubscribe
              </>
            ) : (
              <>
                <BellOutlineIcon className="w-4" />
                Subscribe
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
