"use client";

import { CSSProperties, useCallback, useId } from "react";
import Script from "next/script";
import { captureException } from "@sentry/nextjs";
import { getCssVarValue } from "@/lib/utils/styleHelpers";
import {
  CloudinaryImageType,
  cloudinaryUploadArgsByImageType,
  formPreviewSizeByImageType,
  getCloudinaryCloudName,
  makeCloudinaryImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";
import toast from "react-hot-toast";
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

  const onUploadImage = useCallback(() => {
    try {
      if (!window.cloudinary) {
        throw new Error("Cloudinary is not loaded");
      }

      const cloudinaryArgs = cloudinaryUploadArgsByImageType[imageType];
      if (!cloudinaryArgs) {
        throw new Error("Unsupported image upload type");
      }

      const uploadPreset = cloudinaryArgs.uploadPreset;
      if (!uploadPreset) {
        throw new Error(`Cloudinary upload preset not configured for ${imageType}`);
      }

      const primaryColor = getCssVarValue("--color-primary-main");

      window.cloudinary.openUploadWidget(
        {
          multiple: false,
          sources: [
            "local",
            "url",
            "camera",
            "facebook",
            "instagram",
            "google_drive",
          ],
          cropping: true,
          cloudName: getCloudinaryCloudName(),
          theme: "minimal",
          croppingValidateDimensions: true,
          croppingShowDimensions: true,
          styles: {
            palette: {
              tabIcon: primaryColor,
              link: primaryColor,
              action: primaryColor,
              textDark: "#212121",
            },
            frame: {
              background: "#0E2F5A99",
            },
            fonts: {
              default: null,
              '"Inter", sans-serif': {
                url: "https://fonts.googleapis.com/css?family=Inter",
                active: true,
              },
            },
          },
          maxFileSize: 5_000_000, // 5 MB
          ...cloudinaryArgs,
          uploadPreset,
          croppingAspectRatio,
        },
        (error, result) => {
          if (error) {
            throw new Error(error?.statusText ?? "Failed to upload image");
          }

          // Currently we ignore all events other than a successful upload - See
          // https://cloudinary.com/documentation/upload_widget_reference#events
          if (result && result.event !== "success") {
            return;
          }

          const publicId = result?.info?.public_id;
          if (!publicId) {
            throw new Error("Failed to upload image");
          }
          setValue(publicId);
        },
      );
    } catch (e) {
      console.error("ImageUpload:", e);
      toast.error("Error uploading image, please try again");
      captureException(e);
    }
  }, [croppingAspectRatio, imageType, setValue]);

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
      <Script
        src="https://upload-widget.cloudinary.com/latest/global/all.js"
        type="text/javascript"
      />
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
