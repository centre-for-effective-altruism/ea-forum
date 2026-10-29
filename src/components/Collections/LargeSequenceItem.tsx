import type { HandbookSequence } from "@/lib/collections/handbookQueries";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import sumBy from "lodash/sumBy";
import PostBody from "../ContentStyles/PostBody";
import CloudinaryImage from "../CloudinaryImage";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";
import SequencePostLink from "./SequencePostLink";

const DEFAULT_SEQUENCE_IMAGE_ID = "sequences/vnyzzznenju0hzdv6pqb.jpg";

export default function LargeSequenceItem({
  sequence,
}: Readonly<{
  sequence: HandbookSequence;
}>) {
  const { _id, title, gridImageId, html, chapters } = sequence;
  const sequenceUrl = sequenceGetPageUrl({ sequence });
  const posts = chapters.flatMap(({ posts }) => posts);
  const readTimeMinutes = sumBy(posts, "readTimeMinutes");
  const wordCount = sumBy(posts, "wordCount");
  return (
    <article
      data-component="LargeSequenceItem"
      id={_id}
      className="
        scroll-mt-20 rounded border-1 border-gray-200 overflow-hidden
        flex flex-col sm:flex-row
      "
    >
      <div className="sm:w-[45%] sm:shrink-0 relative flex flex-col">
        <Link href={sequenceUrl} className="absolute inset-x-0 top-0 h-[125px]">
          <CloudinaryImage
            publicId={gridImageId || DEFAULT_SEQUENCE_IMAGE_ID}
            imgProps={{ w: "584", h: "250" }}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div
            className="
              bg-linear-to-t from-gray-0 via-gray-0/50 to-transparent
              absolute inset-0
            "
          />
        </Link>
        <div className="relative p-4 pt-[90px] flex flex-col gap-3">
          <Type style="postTitle" As="h3" className="text-[20px] leading-[1.3]">
            <Link href={sequenceUrl} className="hover:text-gray-700">
              {title}
            </Link>
          </Type>
          {html && (
            <PostBody
              html={html}
              smallText
              className="
                line-clamp-6
                [&_iframe]:hidden! [&_img]:hidden! [&_video]:hidden!
                [&_hr]:hidden! [&_table]:hidden!
              "
            />
          )}
          <Tooltip
            As="span"
            className="self-start"
            title={
              <Type style="bodySmall">
                {wordCount.toLocaleString("en-US")} words
              </Type>
            }
          >
            <Type className="text-gray-600">{readTimeMinutes} min read</Type>
          </Tooltip>
        </div>
      </div>
      <div className="flex-1 min-w-0 p-4 sm:pl-6 pt-0 sm:pt-4 flex flex-col gap-3">
        {chapters.map((chapter) => (
          <div key={chapter._id} className="flex flex-col gap-2">
            {chapter.title && (
              <Type style="sectionTitleSmall" As="h4" className="mt-1">
                {chapter.title}
              </Type>
            )}
            {chapter.posts.map((post, i) => (
              <SequencePostLink
                key={`${post._id}-${i}`}
                post={post}
                sequenceId={_id}
              />
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}
