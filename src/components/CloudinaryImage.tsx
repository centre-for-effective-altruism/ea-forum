"use client";

import { useRef, CSSProperties, useEffect } from "react";
import {
  CloudinaryPropsType,
  makeCloudinaryImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";

export default function CloudinaryImage({
  width,
  height,
  objectFit,
  publicId,
  darkPublicId,
  imgProps,
  preCrop,
  alt = "",
  loading,
  onLoaded,
  style,
  className = "",
  wrapperClassName = "",
}: Readonly<{
  width?: number | string;
  height?: number;
  objectFit?: "fill" | "contain" | "cover" | "none" | "scale-down";
  publicId: string;
  darkPublicId?: string | null;
  imgProps?: CloudinaryPropsType;
  preCrop?: boolean;
  alt?: string;
  loading?: "lazy" | "eager";
  onLoaded?: () => void;
  style?: CSSProperties;
  className?: string;
  wrapperClassName?: string;
}>) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If the image is cached then the normal `onLoad` callback isn't called and
    // we have to trigger this manually instead
    if (imgRef.current?.complete) {
      onLoaded?.();
    }
  }, [onLoaded]);

  // TODO: Handle dark mode
  const themeOptions = { name: "default" };

  const cloudinaryProps: CloudinaryPropsType = {
    c: "fill",
    dpr: "auto",
    q: "auto",
    f: "auto",
    g: "auto:faces",
  };
  const imageStyle: CSSProperties = {};

  if (width) {
    cloudinaryProps.w = width.toString();
    imageStyle.width = width;
  }
  if (height) {
    cloudinaryProps.h = height.toString();
    imageStyle.height = height + "px";
  }

  if (objectFit) {
    imageStyle.objectFit = objectFit;
  }

  Object.assign(cloudinaryProps, imgProps);

  // Dark image should be used when:
  //  - (darkPublicId is defined, obvs)
  //  - And either:
  //    - User is in dark mode
  //    - Or, user is in auto mode, and their browser reports that they prefer
  //      dark mode
  // That last condition cannot be determined from the server, sadly. So we will
  // have to rely on media queries
  let shouldUseDarkImage: "yes" | "no" | "maybe" = "yes";
  if (!darkPublicId || themeOptions.name === "default") {
    shouldUseDarkImage = "no";
  } else if (themeOptions.name === "auto") {
    shouldUseDarkImage = "maybe";
  } // themeOption.name must be dark, defaulting to yes
  // Cast is safe because if shouldUseDarkImage is "yes" we know that darkPublicId is defined
  const basicImageUrl = makeCloudinaryImageUrl(
    shouldUseDarkImage === "yes" ? darkPublicId! : publicId,
    cloudinaryProps,
    { preCrop },
  );
  const darkImageUrl =
    darkPublicId &&
    makeCloudinaryImageUrl(darkPublicId, cloudinaryProps, { preCrop });

  return (
    <picture
      style={style}
      className={wrapperClassName}
      data-component="CloudinaryImage"
    >
      {shouldUseDarkImage === "maybe" && (
        <source
          // Cast is safe for similar reasons to above
          srcSet={darkImageUrl!}
          media="(prefers-color-scheme: dark)"
        />
      )}
      <img
        ref={imgRef}
        alt={alt}
        loading={loading}
        onLoad={onLoaded}
        src={basicImageUrl}
        style={imageStyle}
        className={className}
      />
    </picture>
  );
}
