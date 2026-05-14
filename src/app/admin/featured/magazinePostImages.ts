import { getSocialImagePreviewPrefix } from "@/lib/cloudinary/cloudinaryHelpers";
import {
  getPostSocialImageUrl,
  type PostWithSocialPreview,
} from "@/lib/posts/postsHelpers";

export const DEFAULT_MAGAZINE_POST_IMAGE_IDS = [
  "SocialPreview/defaults/building",
  "SocialPreview/defaults/scale",
  "SocialPreview/defaults/leaf",
  "SocialPreview/defaults/camera",
  "SocialPreview/defaults/clouds",
  "SocialPreview/defaults/landscape",
  "SocialPreview/defaults/earth",
  "SocialPreview/defaults/space",
  "SocialPreview/defaults/microscope",
  "SocialPreview/defaults/compass",
  "SocialPreview/defaults/circuitboard",
  "SocialPreview/defaults/chess",
  "SocialPreview/defaults/flower2",
  "SocialPreview/defaults/gears",
] as const;

type MagazinePostImagePost = PostWithSocialPreview & {
  _id: string;
};

const normalizeCloudinaryPublicId = (publicId: string) =>
  publicId.replace(/^\/+/, "");

const hashStringToUint32 = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const getDefaultMagazinePostImageId = (
  postId: string,
  imageIds: readonly string[] = DEFAULT_MAGAZINE_POST_IMAGE_IDS,
) => {
  if (imageIds.length === 0) {
    throw new Error("Default magazine post image list must not be empty");
  }

  let selectedImageId = normalizeCloudinaryPublicId(imageIds[0]);
  let selectedScore = hashStringToUint32(`${postId}:${selectedImageId}`);

  for (let i = 1; i < imageIds.length; i++) {
    const imageId = normalizeCloudinaryPublicId(imageIds[i]);
    const score = hashStringToUint32(`${postId}:${imageId}`);
    if (score > selectedScore) {
      selectedImageId = imageId;
      selectedScore = score;
    }
  }

  return selectedImageId;
};

export const getMagazinePostImageUrl = (post: MagazinePostImagePost) => {
  const socialImageUrl = getPostSocialImageUrl(post);
  if (socialImageUrl) {
    return socialImageUrl;
  }

  return getSocialImagePreviewPrefix() + getDefaultMagazinePostImageId(post._id);
};
