import { AnalyticsContext } from "@/lib/analyticsEvents";
import { makeCloudinaryImageUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";
import SpotlightSequenceNavigation from "./SpotlightSequenceNavigation";
import CommentBody from "../ContentStyles/CommentBody";
import Type from "../Type";
import Link from "../Link";
import clsx from "clsx";

export default function Spotlight({
  spotlight: { title, descriptionHtml, post, sequence, imageId, imageFadeColor },
  className,
}: Readonly<{
  spotlight: SpotlightBase;
  className?: string;
}>) {
  const imageUrl = makeCloudinaryImageUrl(imageId ?? "", {
    w: "716",
    h: "130",
    dpr: "auto",
    c: "lfill",
    g: "auto:faces",
    f: "auto",
    q: "auto",
  });
  const link = post
    ? postGetPageUrl({ post })
    : sequence
      ? sequenceGetPageUrl({ sequence })
      : "#";
  return (
    <AnalyticsContext pageElementContext="spotlightItem">
      <article
        data-component="Spotlight"
        className={clsx(
          "relative w-full min-h-[130px] rounded text-always-white flex",
          "overflow-hidden",
          className,
        )}
        style={{ background: imageFadeColor ?? undefined }}
      >
        <div
          aria-hidden
          className={clsx(
            "absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat",
            imageFadeColor && "spotlight-image-mask",
          )}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="relative z-10 w-full self-stretch flex-1 flex flex-col px-4 py-3">
          <Type style="spotlightTitle">
            <Link href={link} className="hover:underline">
              {title || post?.title || sequence?.title}
            </Link>
          </Type>
          {descriptionHtml && (
            <CommentBody
              html={descriptionHtml}
              className="
                w-[350px] max-w-full mt-0.5
                [&_*]:text-always-white! [&_a]:underline
              "
            />
          )}
          <div className="grow flex flex-row items-end">
            <SpotlightSequenceNavigation sequence={sequence} className="mt-3" />
          </div>
        </div>
      </article>
    </AnalyticsContext>
  );
}
