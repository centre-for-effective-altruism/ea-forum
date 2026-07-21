"use client";

import { CSSProperties, useCallback, useId } from "react";
import {
  CloudinaryImageType,
  formPreviewSizeByImageType,
  makeCloudinaryImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import Button from "../Button";
import Label from "./Label";

export default function ImageUpload({
  value,
  setValue,
  imageType,
  croppingAspectRatio,
  placeholderUrl,
  label,
}: Readonly<{
  value: string | null;
  setValue: (value: string | null) => void;
  imageType: CloudinaryImageType;
  croppingAspectRatio?: number;
  placeholderUrl?: string;
  label?: string;
}>) {
  const id = useId();

  const { onUploadImage, CloudinaryScript } = useImageUpload({
    imageType,
    croppingAspectRatio,
    onSuccess: setValue,
  });

  const onRemoveImage = useCallback(() => setValue(null), [setValue]);

  const formPreviewSize = formPreviewSizeByImageType[imageType];
  const imageStyle: CSSProperties = {
    aspectRatio:
      formPreviewSize.width === "auto"
        ? "1.91"
        : `${formPreviewSize.width} / ${formPreviewSize.height}`,
  };

  const imageUrl = value
    ? makeCloudinaryImageUrl(value, {
        c: "fill",
        dpr: "auto",
        q: "auto",
        f: "auto",
        g: "auto:faces",
      })
    : placeholderUrl;
  if (imageUrl) {
    imageStyle.backgroundImage = `url(${imageUrl})`;
  }

  return (
    <div data-component="ImageUpload">
      <CloudinaryScript />
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        id={id}
        style={imageStyle}
        className="
          flex items-end justify-center gap-3 pb-3 rounded
          bg-cover bg-center bg-gray-200
        "
      >
        <Button onClick={onUploadImage} className="image-upload-button">
          {value ? "Change" : "Upload image"}
        </Button>
        {value && (
          <Button variant="greyFilled" onClick={onRemoveImage}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
