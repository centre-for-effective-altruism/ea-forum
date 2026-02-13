import type { ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { CommentTag, PostTag, TagBase } from "@/lib/tags/tagQueries";
import type { SearchTag } from "@/lib/search/searchDocuments";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagBody from "../ContentStyles/TagBody";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function TagTooltip({
  tag,
  placement,
  children,
}: Readonly<{
  tag: TagBase | SearchTag | PostTag | CommentTag;
  placement?: Placement;
  children: ReactNode;
}>) {
  return (
    <Tooltip
      interactable
      placement={placement}
      tooltipClassName="bg-gray-0! text-gray-900! p-0! shadow w-[270px]"
      title={
        <div className="flex flex-col gap-3 p-3 border border-gray-200 rounded">
          {tag.description && <TagBody html={tag.description} isExcerpt />}
          <Type style="bodyHeavy">
            <Link
              href={tagGetPageUrl({ tag })}
              className="text-primary hover:opacity-70"
            >
              View all {tag.postCount} posts
            </Link>
          </Type>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
