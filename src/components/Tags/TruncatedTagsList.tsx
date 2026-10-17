"use client";

import { useState } from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import TagCard from "./TagCard";
import Button from "../Button";

export default function TruncatedTagsList({
  tags,
  initialCount,
}: Readonly<{
  tags: TagBase[];
  initialCount: number;
}>) {
  const [revealed, setRevealed] = useState(false);
  const tagsToShow = revealed ? tags : tags.slice(0, initialCount);
  return (
    <div data-component="TruncatedTagsList">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tagsToShow.map((tag) => (
          <TagCard key={tag._id} tag={tag} />
        ))}
      </div>
      {!revealed && initialCount < tags.length && (
        <Button
          onClick={() => setRevealed(true)}
          variant="greyOutlined"
          className="mt-4"
        >
          Show {tags.length - initialCount} more
        </Button>
      )}
    </div>
  );
}
