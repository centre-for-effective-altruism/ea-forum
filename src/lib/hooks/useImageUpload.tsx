import { FC, useCallback } from "react";
import Script from "next/script";
import { captureException } from "@sentry/nextjs";
import { getCssVarValue } from "../utils/styleHelpers";
import toast from "react-hot-toast";
import {
  CloudinaryImageType,
  cloudinaryUploadArgsByImageType,
  getCloudinaryCloudName,
} from "../cloudinary/cloudinaryHelpers";

const CloudinaryScript: FC = () => (
  <Script
    src="https://upload-widget.cloudinary.com/latest/global/all.js"
    type="text/javascript"
  />
);

export const useImageUpload = ({
  imageType,
  croppingAspectRatio,
  onSuccess,
}: {
  imageType: CloudinaryImageType;
  croppingAspectRatio?: number;
  onSuccess: (imageId: string) => void;
}) => {
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
          onSuccess(publicId);
        },
      );
    } catch (e) {
      console.error("ImageUpload:", e);
      toast.error("Error uploading image, please try again");
      captureException(e);
    }
  }, [croppingAspectRatio, imageType, onSuccess]);

  return { onUploadImage, CloudinaryScript };
};
