import { suite, test, expect, beforeEach, vi } from "vitest";
import { load as cheerioLoad } from "cheerio";
import cloudinary, { UploadApiResponse } from "cloudinary";
import { db } from "@/lib/db";
import { createTestRevisionFromHtml } from "./testHelpers";
import { convertImagesInObject } from "@/lib/cloudinary/convertImagesToCloudinary";
import { randomId } from "@/lib/utils/random";
import { images } from "@/lib/schema";

vi.mock("cloudinary", () => ({
  default: {
    v2: {
      uploader: {
        upload: vi.fn(),
      },
      url: vi.fn(),
    },
  },
}));

vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
vi.stubEnv("CLOUDINARY_API_KEY", "test-key");
vi.stubEnv("CLOUDINARY_API_SECRET", "test-secret");

suite("Image Conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default cloudinary mock responses
    vi.mocked(cloudinary.v2.uploader.upload).mockResolvedValue({
      public_id: "test-public-id",
      secure_url: "https://res.cloudinary.com/test/image.jpg",
    } as UploadApiResponse);

    vi.mocked(cloudinary.v2.url).mockReturnValue(
      "https://res.cloudinary.com/test/image.jpg?q_auto&f_auto",
    );
  });

  suite("URL filtering and whitelisting", () => {
    test("should not mirror cloudinary URLs", async () => {
      const html =
        '<img src="https://res.cloudinary.com/test/not-cloudinary.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.numUploaded).toBe(0);
      expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
    });
    test("should not mirror whitelisted domain URLs", async () => {
      const html = '<img src="https://www.lesswrong.com/whitelisted.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.numUploaded).toBe(0);
      expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
    });
    test("should mirror non-whitelisted URLs", async () => {
      const html = '<img src="https://example.com/non-whitelisted.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.numUploaded).toBe(1);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        "https://example.com/non-whitelisted.jpg",
        expect.objectContaining({
          folder: expect.stringContaining("mirroredImages"),
        }),
      );
    });
    test("should respect custom URL filter function", async () => {
      const html = `
        <img src="https://example.com/allow.jpg" />
        <img src="https://example.com/block.jpg" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      const filterFn = (url: string) => url.includes("allow");
      const result = await convertImagesInObject(db, revision, filterFn);
      expect(result.numUploaded).toBe(1);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(1);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        "https://example.com/allow.jpg",
        expect.any(Object),
      );
    });
  });

  suite("Image URL extraction", () => {
    test("should extract URLs from img src attributes", async () => {
      const html = '<img src="https://example.com/extra-from-src.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        "https://example.com/extra-from-src.jpg",
        expect.any(Object),
      );
    });
    test("should extract URLs from srcset attributes", async () => {
      const html = `
        <img srcset="https://example.com/small.jpg 480w, https://example.com/large.jpg 800w" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(2);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        "https://example.com/small.jpg",
        expect.any(Object),
      );
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        "https://example.com/large.jpg",
        expect.any(Object),
      );
    });
    test("should extract URLs from both src and srcset", async () => {
      const html = `
        <img
          src="https://example.com/src-example.jpg"
          srcset="https://example.com/small-srcset.jpg 480w, https://example.com/large-srcset.jpg 800w"
        />
      `;
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(3);
    });
    test("should deduplicate URLs", async () => {
      const html = `
        <img src="https://example.com/duplicate.jpg" />
        <img src="https://example.com/duplicate.jpg" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(1);
    });
    test("should handle multiple images", async () => {
      const html = `
        <img src="https://example.com/image1.jpg" />
        <img src="https://example.com/image2.jpg" />
        <img src="https://example.com/image3.jpg" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(3);
    });
  });

  suite("Cloudinary upload", () => {
    test("should upload to cloudinary with correct folder", async () => {
      const html = '<img src="https://example.com/test-folder.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        "https://example.com/test-folder.jpg",
        expect.objectContaining({
          folder: `mirroredImages/${revision._id}`,
          cloud_name: "test-cloud",
          api_key: "test-key",
          api_secret: "test-secret",
        }),
      );
    });
    test("should apply auto quality and format transformations", async () => {
      const html = '<img src="https://example.com/transformations.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      expect(cloudinary.v2.url).toHaveBeenCalledWith(
        "test-public-id",
        expect.objectContaining({
          quality: "auto",
          fetch_format: "auto",
          secure: true,
        }),
      );
    });
    test("should save image record to database", async () => {
      const html = '<img src="https://example.com/save-image.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      await convertImagesInObject(db, revision);
      const savedImage = await db.query.images.findFirst({
        where: {
          identifier: "https://example.com/save-image.jpg",
        },
      });
      expect(savedImage).toBeTruthy();
      expect(savedImage?.identifierType).toBe("originalUrl");
      expect(savedImage?.cdnHostedUrl).toContain("cloudinary.com");
    });
    test("should reuse existing cloudinary images", async () => {
      const imageUrl = "https://example.com/reuse.jpg";
      const cdnUrl = "https://res.cloudinary.com/test/existing.jpg";
      // Pre-insert an image record
      await db.insert(images).values({
        _id: randomId(),
        identifier: imageUrl,
        identifierType: "originalUrl",
        cdnHostedUrl: cdnUrl,
      });
      const html = `<img src="${imageUrl}" />`;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      // Should not upload again
      expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
      // Should use existing CDN URL
      expect(result.newRevision!.html).not.toContain(imageUrl);
    });
  });

  suite("Archive.org fallback", () => {
    test("should try archive.org if initial upload fails", async () => {
      const imageUrl = "https://example.com/archive-org-test.jpg";
      const archiveUrl = `https://web.archive.org/web/19000101000000id_/${imageUrl}`;
      vi.mocked(cloudinary.v2.uploader.upload)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          public_id: "archive-id",
          secure_url: "https://res.cloudinary.com/test/archived.jpg",
        } as UploadApiResponse);
      const html = `<img src="${imageUrl}" />`;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(2);
      expect(cloudinary.v2.uploader.upload).toHaveBeenNthCalledWith(
        1,
        imageUrl,
        expect.any(Object),
      );
      expect(cloudinary.v2.uploader.upload).toHaveBeenNthCalledWith(
        2,
        archiveUrl,
        expect.any(Object),
      );
      expect(result.numUploaded).toBe(1);
      expect(result.failedUrls).toHaveLength(0);
    });
    test("should add to failed URLs if both attempts fail", async () => {
      const imageUrl = "https://example.com/failed-urls-test.jpg";
      vi.mocked(cloudinary.v2.uploader.upload).mockRejectedValue(
        new Error("Failed"),
      );
      const html = `<img src="${imageUrl}" />`;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.numUploaded).toBe(0);
      expect(result.failedUrls).toStrictEqual([imageUrl]);
    });
  });

  suite("HTML rewriting", () => {
    test("should replace src attributes with cloudinary URLs", async () => {
      const html = '<img src="https://example.com/replace-src.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.html).toContain("res.cloudinary.com");
      expect(result.newRevision?.html).not.toContain("example.com/replace-src.jpg");
    });
    test("should rewrite srcset attributes", async () => {
      const html = `
        <img srcset="https://example.com/rewrite-small.jpg 480w, https://example.com/rewrite-large.jpg 800w" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.html).toContain("res.cloudinary.com");
      expect(result.newRevision?.html).toContain("480w");
      expect(result.newRevision?.html).toContain("800w");
      expect(result.newRevision?.html).not.toContain("example.com");
    });
    test("should preserve other HTML structure", async () => {
      const html = `
        <div class="container">
          <p>Some text</p>
          <img src="https://example.com/preserve.jpg" alt="Test" />
          <p>More text</p>
        </div>
      `;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      const $ = cheerioLoad(result.newRevision?.html || "");
      expect($(".container")).toHaveLength(1);
      expect($("p")).toHaveLength(2);
      expect($("img").attr("alt")).toBe("Test");
    });
    test("should not modify images that were not converted", async () => {
      const html = `
        <img src="https://res.cloudinary.com/existing-not-modify.jpg" />
        <img src="https://example.com/new-not-modify.jpg" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.html).toContain(
        "res.cloudinary.com/existing-not-modify.jpg",
      );
    });
  });

  suite("Revision creation", () => {
    test("should create new revision with updated HTML", async () => {
      const html = '<img src="https://example.com/new-revision.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeTruthy();
      expect(result.newRevision?._id).not.toBe(revision._id);
      expect(result.newRevision?.html).not.toBe(revision.html);
    });
    test("should increment patch version", async () => {
      const html = '<img src="https://example.com/increment-patch.jpg" />';
      const revision = await createTestRevisionFromHtml(html, "1.2.3");
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.version).toBe("1.2.4");
      expect(result.newRevision?.updateType).toBe("patch");
    });
    test("should set commit message", async () => {
      const html = '<img src="https://example.com/set-commit.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.commitMessage).toBe("Move images to CDN");
    });
    test("should update timestamps", async () => {
      const html = '<img src="https://example.com/update-time.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const originalEditedAt = revision.editedAt;
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.editedAt).not.toBe(originalEditedAt);
      expect(result.newRevision?.createdAt).toBeTruthy();
    });
    test("should include change metrics", async () => {
      const html = '<img src="https://example.com/change-metrics.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision?.changeMetrics).toBeTruthy();
    });
    test("should not create revision if no images were converted", async () => {
      const html = '<img src="https://res.cloudinary.com/existing-no-rev.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
    });
    test("should not create revision if revision has no HTML", async () => {
      const revision = await createTestRevisionFromHtml("", "1.0.0");
      revision.html = null;
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
    });
  });

  suite("Error handling", () => {
    test("should handle missing cloudinary credentials gracefully", async () => {
      vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "");
      const html = '<img src="https://example.com/missing-credentials.jpg" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
      // Restore env var
      vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
    });
    test("should handle invalid URLs gracefully", async () => {
      const html = '<img src="not-a-valid-url" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
    });
    test("should continue processing other images if one fails", async () => {
      vi.mocked(cloudinary.v2.uploader.upload)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockRejectedValueOnce(new Error("Failed")) // Archive.org attempt
        .mockResolvedValueOnce({
          public_id: "success-id",
          secure_url: "https://res.cloudinary.com/test/success.jpg",
        } as UploadApiResponse);
      const html = `
        <img src="https://example.com/fail.jpg" />
        <img src="https://example.com/success.jpg" />
      `;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.numUploaded).toBe(1);
      expect(result.failedUrls).toContain("https://example.com/fail.jpg");
    });
    test("should catch and log errors without throwing", async () => {
      const revision = await createTestRevisionFromHtml(
        '<img src="https://example.com/log-and-catch.jpg" />',
      );
      // Force an error by making the database insert fail
      const originalInsert = db.insert;
      vi.spyOn(db, "insert").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
      db.insert = originalInsert;
    });
  });

  suite("Edge cases", () => {
    test("should handle empty HTML", async () => {
      const revision = await createTestRevisionFromHtml("");
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
    });
    test("should handle HTML with no images", async () => {
      const html = "<div><p>No images here</p></div>";
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
    });
    test("should handle images without src or srcset", async () => {
      const html = '<img alt="No source" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
      expect(result.numUploaded).toBe(0);
    });
    test("should handle malformed srcset", async () => {
      const html = '<img srcset="malformed srcset" />';
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.newRevision).toBeNull();
    });
    test("should handle very large HTML documents", async () => {
      const images = Array.from(
        { length: 100 },
        (_, i) => `<img src="https://example.com/very-large-${i}.jpg" />`,
      ).join("");
      const html = `<div>${images}</div>`;
      const revision = await createTestRevisionFromHtml(html);
      const result = await convertImagesInObject(db, revision);
      expect(result.numUploaded).toBe(100);
    });
  });
});
