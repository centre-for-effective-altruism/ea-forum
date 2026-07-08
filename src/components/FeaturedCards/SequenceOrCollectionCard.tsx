import { FC, ReactNode } from "react";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import type { UserBase } from "@/lib/users/userQueries";
import CloudinaryImage from "../CloudinaryImage";
import UsersName from "../UsersName";
import Type from "../Type";
import Link from "../Link";
import clsx from "clsx";

export default function SequenceOrCollectionCard({
  title,
  author,
  TitleWrapper,
  postCount,
  readCount,
  hideReadCount,
  imageId,
  href,
  className,
}: Readonly<{
  title: string;
  author: UserBase | null;
  TitleWrapper: FC<{ children: ReactNode }>;
  postCount: number;
  readCount: number;
  hideReadCount?: boolean;
  imageId: string;
  href: string;
  className?: string;
}>) {
  const { onClick } = useClickableCell({ href });
  return (
    <article
      data-component="SequenceOrCollectionCard"
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded bg-surface-floating ml-2 mb-2 shadow-md",
        "flex-1 self-stretch border-1 border-transparent hover:border-gray-200",
        "hover:bg-surface-floating-hover [box-shadow:var(--shadow-featured-card)]",
        className,
      )}
    >
      <div className="relative">
        <CloudinaryImage
          publicId={imageId}
          imgProps={{
            h: "162",
            dpr: "auto",
            q: "auto",
            f: "auto",
          }}
          className="w-full h-[162px] object-cover z-1 rounded-t"
        />
        {!hideReadCount && (
          <Type
            style="bodySmall"
            className="
              absolute z-2 top-2 left-2 rounded-[14px] px-2 py-1.5
              bg-background/80
            "
          >
            {readCount}/{postCount} read
          </Type>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5">
        <TitleWrapper>
          <InteractionWrapper>
            <Type style="postTitle">
              <Link href={href} className="line-clamp-2">
                {title}
              </Link>
            </Type>
          </InteractionWrapper>
        </TitleWrapper>
        <Type className="text-gray-600">
          <InteractionWrapper className="inline">
            <UsersName user={author} />
          </InteractionWrapper>
          {" · "}
          {postCount} posts
        </Type>
      </div>
    </article>
  );
}
