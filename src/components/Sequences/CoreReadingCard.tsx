"use client";

import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import CloudinaryImage from "../CloudinaryImage";
import UsersName from "../UsersName";
import Type from "../Type";
import Link from "../Link";
import clsx from "clsx";

export type CoreReadingItem = {
  title: string;
  href: string;
  author: { slug: string; displayName: string };
  summary: string;
  imageId: string;
  color: string;
};

export default function CoreReadingCard({
  item: { title, href, author, summary, imageId, color },
  big,
  className,
}: Readonly<{
  item: CoreReadingItem;
  big?: boolean;
  className?: string;
}>) {
  const { onClick } = useClickableCell({ href });
  return (
    <article
      data-component="CoreReadingCard"
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded bg-surface-floating p-5 flex gap-4",
        "border-1 border-transparent hover:border-gray-200",
        "hover:bg-surface-floating-hover [box-shadow:var(--shadow-featured-card)]",
        big
          ? "flex-col md:flex-row md:gap-8 md:h-[318px]"
          : "flex-col justify-between md:h-[315px]",
        className,
      )}
    >
      {big && (
        <CloudinaryImage
          publicId={imageId}
          imgProps={{ w: "652", h: "542" }}
          className="
            order-2 md:order-none w-full h-[90px] object-cover
            md:w-[326px] md:h-[271px] md:shrink-0
          "
        />
      )}
      <div
        className="border-t-4 pt-3 flex flex-col gap-2 md:max-w-[307px]"
        style={{ borderTopColor: color }}
      >
        <Type style="sectionTitleLarge">
          <InteractionWrapper className="inline">
            <Link href={href}>{title}</Link>
          </InteractionWrapper>
        </Type>
        <Type className="text-gray-600">
          by{" "}
          <InteractionWrapper className="inline">
            <UsersName user={author} />
          </InteractionWrapper>
        </Type>
        <Type style="body" className="text-gray-1000">
          {summary}
        </Type>
      </div>
      {!big && (
        <CloudinaryImage
          publicId={imageId}
          imgProps={{ w: "614", h: "172" }}
          className="w-full h-[86px] object-cover"
        />
      )}
    </article>
  );
}
