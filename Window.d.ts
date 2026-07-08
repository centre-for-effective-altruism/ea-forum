declare global {
  interface Window {
    google_tag_manager?: unknown;
    ga?: {
      create?: unknown;
    };
    dataLayer?: unknown[];
    tabId?: string;
    /**
     * https://cloudinary.com/documentation/upload_widget_reference
     */
    cloudinary?: {
      openUploadWidget: (
        options: {
          cloudName: string;
          uploadPreset: string;
          multiple?: boolean;
          secure?: boolean;
          encryption?: { key: string; iv: string };
          sources?: string[];
          defaultSource?: string;
          maxFiles?: number;
          cropping?: boolean;
          croppingAspectRatio?: number;
          croppingDefaultSelectionRatio?: number;
          croppingValidateDimensions?: boolean;
          croppingShowDimensions?: boolean;
          croppingShowBackButton?: boolean;
          croppingCoordinatesMode?: "custom" | "face";
          showSkipCropButton?: boolean;
          publicId?: string;
          folder?: string;
          tags?: string[];
          resourceType?: string;
          context?: Record<string, string>;
          uploadSignature?: string | (() => string);
          uploadSignatureTimestamp?: number;
          clientAllowedFormats?: string[];
          maxFileSize?: number;
          maxImageFileSize?: number;
          maxVideoFileSize?: number;
          maxRawFileSize?: number;
          minImageWidth?: number;
          maxImageWidth?: number;
          minImageHeight?: number;
          maxImageHeight?: number;
          validateMaxWidthHeight?: boolean;
          maxChunkSize?: number;
          form?: string;
          fieldName?: string;
          thumbnails?: string;
          thumbnailTransformation?: string | Record<string, string | number>[];
          buttonClass?: string;
          buttonCaption?: string;
          theme?: string;
          text?: Record<string, string>;
          styles?: {
            palette?: Record<string, string>;
            frame?: Record<string, string>;
            fonts?: Record<
              string,
              {
                url: string;
                active: boolean;
              } | null
            >;
          };
          showPoweredBy?: boolean;
          autoMinimize?: boolean;
        },
        resultCallback: (
          error: CloudinaryImageUploadError | null,
          result: CloundinaryImageUploadResult | null,
        ) => void,
      ) => void;
    };
  }
}

export {};
