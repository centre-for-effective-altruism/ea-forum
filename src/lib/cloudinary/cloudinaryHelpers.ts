// See their documentation:
// https://cloudinary.com/documentation/transformation_reference
export type CloudinaryPropsType = {
  dpr?: string; // Device pixel ratio
  ar?: string; // Aspect ratio
  w?: string; // Width
  h?: string; // Height
  c?: string; // Crop
  g?: string; // Gravity
  q?: string; // Quality
  f?: string; // Format
  b?: string; // Background
};

const cloudinaryPropsToString = (props: Record<string, string>) => {
  const sb: string[] = [];
  for (const prop in props) {
    sb.push(`${prop}_${props[prop]}`);
  }
  return sb.join(",");
};

export const getCloudinaryCloudName = () => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Cloudinary cloud name not configured");
  }
  return cloudName;
};

export const makeCloudinaryImageUrl = (
  publicId: string,
  cloudinaryProps: CloudinaryPropsType,
) =>
  `https://res.cloudinary.com/${getCloudinaryCloudName()}/image/upload/c_crop,g_custom/${cloudinaryPropsToString(cloudinaryProps)}/${publicId}`;

export const getSiteLogoUrl = (sizePixels: number) =>
  `https://images.ctfassets.net/ohf186sfn6di/7J4cBC9SXCWMoqqCIqI0GI/affe205261bb8cff47501a0ada0f2268/ea-logo-square-1200x1200__1_.png?h=${sizePixels}`;

export const getSiteOgImageUrl = () =>
  "https://res.cloudinary.com/cea/image/upload/v1582740871/EA_Forum_OG_Image.png";

export const cloudinaryUploadArgsByImageType = {
  gridImageId: {
    minImageHeight: 80,
    minImageWidth: 203,
    croppingAspectRatio: 2.5375,
    uploadPreset: "omqmhwsk",
  },
  bannerImageId: {
    minImageHeight: 300,
    minImageWidth: 700,
    croppingAspectRatio: 4.7,
    croppingDefaultSelectionRatio: 1,
    uploadPreset: "dg6sakas",
  },
  squareImageId: {
    minImageHeight: 300,
    minImageWidth: 300,
    croppingAspectRatio: 1,
    croppingDefaultSelectionRatio: 1,
    // Reuse the banner upload preset, since they are basically different
    // versions of the same image
    uploadPreset: "dg6sakas",
  },
  profileImageId: {
    minImageHeight: 170,
    minImageWidth: 170,
    croppingAspectRatio: 1,
    croppingDefaultSelectionRatio: 1,
    uploadPreset: "ckffb3g5",
  },
  socialPreviewImageId: {
    minImageHeight: 270,
    minImageWidth: 500,
    croppingAspectRatio: 1.91,
    croppingDefaultSelectionRatio: 1.91,
    uploadPreset: "xgsjqx55",
  },
  eventImageId: {
    minImageHeight: 270,
    minImageWidth: 500,
    croppingAspectRatio: 1.91,
    croppingDefaultSelectionRatio: 1.91,
    uploadPreset: "r8g0ckcq",
  },
  spotlightImageId: {
    minImageHeight: 232,
    minImageWidth: 345,
    cropping: false,
    uploadPreset: "dg6sakas",
  },
  onsiteDigestImageId: {
    minImageHeight: 300,
    minImageWidth: 200,
    cropping: false,
    uploadPreset: "kwiphued",
  },
} as const;

export type CloudinaryImageType = keyof typeof cloudinaryUploadArgsByImageType;

export const formPreviewSizeByImageType: Record<
  CloudinaryImageType,
  { width: number | "auto"; height: number; imgProps?: Record<string, string> }
> = {
  gridImageId: { width: 250, height: 100 },
  bannerImageId: { width: 1600, height: 380, imgProps: { g: "custom", dpr: "2.0" } },
  squareImageId: { width: 90, height: 90 },
  profileImageId: { width: 90, height: 90 },
  socialPreviewImageId: { width: 153, height: 80 },
  eventImageId: { width: 373, height: 195 },
  spotlightImageId: { width: 716, height: 130 },
  onsiteDigestImageId: { width: 200, height: 300 },
};
