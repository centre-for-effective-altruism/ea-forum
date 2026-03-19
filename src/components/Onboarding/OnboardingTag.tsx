import { useCallback } from "react";
import type { OnboardingTag } from "@/lib/tags/tagQueries";
import { useSubscribeToTag } from "@/lib/hooks/useFilterSettings";
import { useOnboarding } from "./useOnboarding";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import CloudinaryImage from "../CloudinaryImage";
import Type from "../Type";
import clsx from "clsx";

const TAG_SIZE = 103;

export default function OnboardingTag({
  tag,
  onSubscribed,
}: Readonly<{
  tag: OnboardingTag;
  onSubscribed: (id: string, subscribed: boolean) => void;
}>) {
  const { viewAsAdmin } = useOnboarding();
  const { isSubscribed, updateSubscribed } = useSubscribeToTag(tag);

  const toggleSubscribed = useCallback(() => {
    if (!viewAsAdmin) {
      const newSubscribed = !isSubscribed;
      updateSubscribed(newSubscribed);
      onSubscribed(tag._id, newSubscribed);
    }
  }, [viewAsAdmin, tag, isSubscribed, updateSubscribed, onSubscribed]);

  const { name, shortName, squareImageId, bannerImageId } = tag;
  return (
    <article
      data-component="OnboardingTag"
      onClick={toggleSubscribed}
      className="cursor-pointer select-none relative"
      style={{ width: TAG_SIZE, height: TAG_SIZE }}
    >
      <CloudinaryImage
        publicId={squareImageId ?? bannerImageId ?? ""}
        width={TAG_SIZE}
        height={TAG_SIZE}
        imgProps={{
          dpr: String(window.devicePixelRatio ?? 1),
          g: "center",
        }}
        objectFit="cover"
        className={clsx(
          "z-1 absolute rounded-[6px]",
          isSubscribed && "border-3 border-primary-dark",
        )}
      />
      <Type
        style="onboardingTag"
        className={clsx(
          "text-always-white z-2 relative top-0 left-0 rounded-[6px] border-4",
          "flex flex-col-reverse",
          isSubscribed
            ? `
              bg-always-black/50 hover:bg-always-black/40 border-gray-100
              w-[99px] h-[99px] p-[6px] m-[2px]
            `
            : `
              bg-always-black/40 hover:bg-always-black/20 border-transparent
              w-full h-full p-2
            `,
        )}
      >
        {shortName || name}
        {isSubscribed && (
          <CheckIcon
            className="
              absolute top-[6px] right-[6px] text-primary-dark
              w-[18px] h-[18px]
            "
          />
        )}
      </Type>
    </article>
  );
}
