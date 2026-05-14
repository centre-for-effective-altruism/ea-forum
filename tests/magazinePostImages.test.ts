import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getDefaultMagazinePostImageId,
  getMagazinePostImageUrl,
} from "@/app/admin/featured/magazinePostImages";

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/test-cloud/image/upload/c_fill,ar_1.91,g_auto/";

const basePost = {
  _id: "post-id",
  isEvent: false,
  eventImageId: null,
  socialPreview: null,
  socialPreviewImageAutoUrl: null,
};

describe("magazine post images", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("prefers an existing manual social preview image", () => {
    expect(
      getMagazinePostImageUrl({
        ...basePost,
        socialPreview: { imageId: "manual/social-preview" },
      }),
    ).toBe(`${CLOUDINARY_PREFIX}manual/social-preview`);
  });

  test("prefers an existing event image", () => {
    expect(
      getMagazinePostImageUrl({
        ...basePost,
        isEvent: true,
        eventImageId: "events/event-image",
      }),
    ).toBe(`${CLOUDINARY_PREFIX}events/event-image`);
  });

  test("prefers an existing automatically generated social preview image", () => {
    const autoImageUrl = `${CLOUDINARY_PREFIX}auto/social-preview`;

    expect(
      getMagazinePostImageUrl({
        ...basePost,
        socialPreviewImageAutoUrl: autoImageUrl,
      }),
    ).toBe(autoImageUrl);
  });

  test("returns a default cloudinary image when the post has no social preview", () => {
    const imageUrl = getMagazinePostImageUrl(basePost);

    expect(imageUrl).toMatch(
      /^https:\/\/res\.cloudinary\.com\/test-cloud\/image\/upload\/c_fill,ar_1\.91,g_auto\/SocialPreview\/defaults\//,
    );
  });

  test("selects the same default image for the same post id", () => {
    expect(getMagazinePostImageUrl(basePost)).toBe(getMagazinePostImageUrl(basePost));
  });

  test("can select different default images for different post ids", () => {
    const imageIds = new Set(
      Array.from({ length: 20 }, (_, index) =>
        getDefaultMagazinePostImageId(`post-${index}`),
      ),
    );

    expect(imageIds.size).toBeGreaterThan(1);
  });

  test("keeps the selected default stable when the image list is reordered", () => {
    const imageIds = [
      "SocialPreview/defaults/alpha",
      "SocialPreview/defaults/beta",
      "SocialPreview/defaults/gamma",
    ];

    expect(getDefaultMagazinePostImageId("stable-post-id", imageIds)).toBe(
      getDefaultMagazinePostImageId("stable-post-id", imageIds.toReversed()),
    );
  });

  test("normalizes leading slashes from cloudinary public ids", () => {
    expect(getDefaultMagazinePostImageId("post-id", ["/folder/image"])).toBe(
      "folder/image",
    );
  });
});
