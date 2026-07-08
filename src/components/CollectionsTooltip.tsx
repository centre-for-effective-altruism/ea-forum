"use client";

import { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { CollectionBase } from "@/lib/collections/collectionQueries";
import PostBody from "./ContentStyles/PostBody";
import UsersName from "./UsersName";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function CollectionsTooltip({
  collection,
  placement,
  As,
  className,
  children,
}: Readonly<{
  collection: CollectionBase;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  if (!collection) {
    return <>{children}</>;
  }

  const { title, user, html } = collection;
  return (
    <Tooltip
      placement={placement}
      As={As}
      className={className}
      popover
      tooltipClassName="p-0! w-[360px]"
      title={
        <div data-component="CollectionsTooltip" className="px-4 py-3">
          <Type style="postTitle" className="font-[700] mb-1">
            {title}
          </Type>
          <Type style="bodySmall" className="mb-2">
            <UsersName user={user} />
          </Type>
          <PostBody html={html} smallText />
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
