// see their documentation:
// https://cloudinary.com/documentation/transformation_reference
export type CloudinaryPropsType = {
  dpr?: string; // device pixel ratio
  ar?: string; // aspect ratio
  w?: string; // width
  h?: string; // height
  c?: string; // crop
  g?: string; // gravity
  q?: string; // quality
  f?: string; // format
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
