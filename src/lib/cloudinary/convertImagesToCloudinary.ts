import { load as cheerioLoad, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import cloudinary, { UploadApiResponse } from "cloudinary";
import uniq from "lodash/uniq";
import type { DbOrTransaction } from "../db";
import { images, revisions, type Revision } from "../schema";
import { getNextVersion } from "../revisions/revisionHelpers";
import { htmlToChangeMetrics } from "../revisions/htmlToChangeMetrics";
import { randomId } from "../utils/random";
import { sleep } from "../utils/asyncUtils";
import { isAnyTest } from "../environment";

type CloudinaryCredentials = {
  cloud_name: string;
  api_key: string;
  api_secret: string;
};

/**
 * Credentials that can be spread into `cloudinary.v2` functions
 */
const getCloudinaryCredentials = (): CloudinaryCredentials | null => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    if (!isAnyTest) {
      console.error("Cloudinary credentials not configured");
    }
    return null;
  }
  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  };
};

/**
 * Images on domains not in this list will be mirrored on Cloudinary and have
 * their src updated.
 */
const getImageUrlWhitelist = () => {
  const localUploadUrl = process.env.NEXT_PUBLIC_CK_UPLOAD_URL;
  return [
    "cloudinary.com",
    "res.cloudinary.com",
    "www.lesswrong.com",
    "www.alignmentforum.org",
    "www.effectivealtruism.org",
    "forum.effectivealtruism.org",
  ].concat(localUploadUrl ? [new URL(localUploadUrl).host] : []);
};

const urlNeedsMirroring = (url: string, filterFn: (url: string) => boolean) => {
  try {
    const parsedUrl = new URL(url);
    if (getImageUrlWhitelist().indexOf(parsedUrl.hostname) !== -1) {
      return false;
    }
    return filterFn(url);
  } catch {
    return false;
  }
};

const getImageUrlsFromImgTag = (tag: Cheerio<Element>): string[] => {
  const imageUrls: string[] = [];
  const src = tag.attr("src");
  if (src) {
    imageUrls.push(src);
  }
  const srcset = tag.attr("srcset");
  if (srcset) {
    const imageVariants = srcset.split(/,\s/g).map((tok) => tok.trim());
    for (const imageVariant of imageVariants) {
      const [url, _size] = imageVariant.split(" ").map((tok) => tok.trim());
      if (url) {
        imageUrls.push(url);
      }
    }
  }
  return uniq(imageUrls);
};

const imageUrlToArchiveDotOrgUrl = (imageUrl: string): string => {
  // In archive.org URLs, /web/<date>if_/<url> is the version of that URL on or
  // after the given date (it will redirect to replace the given date with the
  // actual date of the snapshot).
  return `https://web.archive.org/web/19000101000000id_/${imageUrl}`;
};

/** If an image has already been re-hosted, return its CDN URL. Otherwise null. */
const findAlreadyMovedImage = async (
  txn: DbOrTransaction,
  identifier: string,
): Promise<string | null> => {
  const image = await txn.query.images.findFirst({
    columns: {
      cdnHostedUrl: true,
    },
    where: {
      identifier,
    },
  });
  return image?.cdnHostedUrl ?? null;
};

/**
 * Returns a cloudinary url of the image corresponding to `identifier`, uploads
 * the image if it doesn't already exist in cloudinary
 */
const getOrCreateCloudinaryImage = async ({
  txn,
  identifier,
  identifierType,
  upload,
}: {
  txn: DbOrTransaction;
  identifier: string;
  identifierType: string;
  upload: (credentials: CloudinaryCredentials) => Promise<UploadApiResponse>;
}) => {
  const alreadyRehosted = await findAlreadyMovedImage(txn, identifier);
  if (alreadyRehosted) {
    return alreadyRehosted;
  }

  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return null;
  }

  const uploadResponse = await upload(credentials);

  // Serve all images with automatic quality and format transformations to save
  // on bandwidth
  const autoQualityFormatUrl = cloudinary.v2.url(uploadResponse.public_id, {
    ...credentials,
    quality: "auto",
    fetch_format: "auto",
    secure: true,
  });

  await txn.insert(images).values({
    _id: randomId(),
    identifier,
    identifierType,
    cdnHostedUrl: autoQualityFormatUrl,
  });

  return autoQualityFormatUrl;
};

/**
 * Re-upload the given image URL to cloudinary, and return the cloudinary URL.
 * If the image has already been uploaded it will return the existing cloudinary
 * URL.
 */
const moveImageToCloudinary = ({
  txn,
  oldUrl,
  originDocumentId,
}: {
  txn: DbOrTransaction;
  oldUrl: string;
  originDocumentId: string;
}): Promise<string | null> => {
  const upload = async (credentials: CloudinaryCredentials) => {
    // First try mirroring the existing URL. If that fails, try retrieving the
    // image from archive.org. If that still fails, let the exception escape,
    // which (in some contexts) will add it to a list of failed images.
    //
    // Note that loading images from archive.org this way is unreliable, even if
    // when archive.org definitely has the image. We don't auto-retry because
    // the unreliability is in some way rate-limit-related, and we have a pretty
    // conservative sleep in between tries. Once an image is successfully
    // recovered from archive.org it stays recovered (we save it in Cloudinary
    // along with its original URL), so you can keep retrying the overall
    // mirroring process until you've got all the images.
    try {
      return await cloudinary.v2.uploader.upload(oldUrl, {
        folder: `mirroredImages/${originDocumentId}`,
        ...credentials,
      });
    } catch (e1) {
      try {
        const archiveDotOrgUrl = imageUrlToArchiveDotOrgUrl(oldUrl);
        if (!isAnyTest) {
          // In order to not risk hitting rate limits, sleep for half a second
          // before each archive.org image
          await sleep(500);
          console.error(`Failed to upload ${oldUrl}; trying ${archiveDotOrgUrl}`);
        }
        return await cloudinary.v2.uploader.upload(archiveDotOrgUrl, {
          folder: `mirroredImages/${originDocumentId}`,
          ...credentials,
        });
      } catch {
        throw e1;
      }
    }
  };

  return getOrCreateCloudinaryImage({
    txn,
    identifier: oldUrl,
    identifierType: "originalUrl",
    upload,
  });
};

const rewriteSrcset = (srcset: string, urlMap: Record<string, string>): string => {
  const imageVariants = srcset.split(/,\s/g).map((tok) => tok.trim());
  const rewrittenImageVariants = imageVariants.map((variant) => {
    const tokens = variant.split(" ");
    if (tokens[0] in urlMap) {
      tokens[0] = urlMap[tokens[0]];
    }
    return tokens.join(" ");
  });
  return rewrittenImageVariants.join(", ");
};

const convertImagesInHtml = async (
  txn: DbOrTransaction,
  html: string,
  originDocumentId: string,
  urlFilterFn: (url: string) => boolean = () => true,
  imageUrlsCache?: Record<string, string>,
): Promise<{ count: number; html: string; failedUrls: string[] }> => {
  const $ = cheerioLoad(html, null, false);
  const imgTags = $("img").toArray();
  const imgUrls: string[] = [];
  const failedUrls: string[] = [];

  for (const imgTag of imgTags) {
    const urls = getImageUrlsFromImgTag($(imgTag));
    for (const url of urls) {
      if (urlNeedsMirroring(url, urlFilterFn)) {
        imgUrls.push(url);
      }
    }
  }

  // Upload all the images to Cloudinary (slow)
  const mirrorUrls: Record<string, string> = imageUrlsCache ?? {};
  // This section was previously parallelized (with a Promise.all), but this
  // would cause it to fail when other servers (notably arcive.org) rejected
  // the concurrent requests for being too fast (which is hard to distinguish
  // from failing for other reasons), so it's no longer parallelized.
  for (const url of imgUrls) {
    // resolve to the url of the image on cloudinary
    try {
      const movedImage = await moveImageToCloudinary({
        txn,
        oldUrl: url,
        originDocumentId,
      });
      if (movedImage) {
        mirrorUrls[url] = movedImage;
      }
    } catch {
      failedUrls.push(url);
    }
  }

  // Cheerio is not guarantueed to return the same html so explicitly count
  // the number of images that were converted
  let count = 0;
  for (let i = 0; i < imgTags.length; i++) {
    const imgTag = $(imgTags[i]);
    const src: string | undefined = imgTag.attr("src");
    if (src) {
      const replacement = mirrorUrls[src];
      if (replacement) {
        imgTag.attr("src", replacement);
        count++;
      }
    }

    const srcset: string | undefined = imgTag.attr("srcset");
    if (srcset) {
      const replacement = rewriteSrcset(srcset, mirrorUrls);
      if (replacement && replacement !== srcset) {
        imgTag.attr("srcset", replacement);
        count++;
      }
    }
  }

  return {
    count,
    html: $.html(),
    failedUrls,
  };
};

/**
 * Reupload all images in an object (post, tag, user, etc) to Cloudinary, for a
 * specific editable field. Creates a new revision with the updated HTML.
 */
export const convertImagesInObject = async (
  txn: DbOrTransaction,
  revision: Revision,
  /**
   * Optional function that takes a URL and returns true if it should be mirrored,
   * by default all URLs are mirrored except those in getImageUrlWhitelist()
   */
  urlFilterFn: (url: string) => boolean = () => true,
): Promise<{
  newRevision: Revision | null;
  numUploaded: number;
  failedUrls: string[];
}> => {
  try {
    const newVersion = getNextVersion(revision, "patch", false);
    if (!revision.html) {
      return { newRevision: null, numUploaded: 0, failedUrls: [] };
    }
    const {
      count: uploadCount,
      html: newHtml,
      failedUrls,
    } = await convertImagesInHtml(txn, revision.html, revision._id, urlFilterFn);
    if (!uploadCount) {
      return { newRevision: null, numUploaded: 0, failedUrls };
    }
    const now = new Date().toISOString();
    const result = await txn
      .insert(revisions)
      .values({
        ...revision,
        _id: randomId(),
        html: newHtml,
        updateType: "patch",
        version: newVersion,
        commitMessage: "Move images to CDN",
        changeMetrics: htmlToChangeMetrics(revision.html, newHtml),
        editedAt: now,
        createdAt: now,
      })
      .returning();
    return {
      newRevision: result[0],
      numUploaded: uploadCount,
      failedUrls,
    };
  } catch (e) {
    // TODO: sentry
    // Always catch the error because the obj should mostly load fine without
    // rehosting the images
    console.error("Error in convertImagesInObject", e);
    return {
      newRevision: null,
      numUploaded: 0,
      failedUrls: [],
    };
  }
};
