import { makeCloudinaryImageUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";

export default function Spotlight({
  spotlight: { title, imageId },
}: Readonly<{
  spotlight: SpotlightBase;
}>) {
  const background = makeCloudinaryImageUrl(imageId ?? "", {
    w: "716",
    h: "130",
    dpr: "auto",
    c: "lfill",
    g: "auto:faces",
    f: "auto",
    q: "auto",
  });
  return (
    <article
      data-component="Spotlight"
      className="w-full h-[130px] rounded"
      style={{ background: `url(${background})` }}
    >
      {title}
    </article>
  );
}
