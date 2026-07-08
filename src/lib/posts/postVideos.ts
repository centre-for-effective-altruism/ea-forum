import { load as cheerioLoad } from "cheerio";
import type { PostListItem } from "./postLists";

const videoHosts = [
  "https://www.youtube.com",
  "https://youtube.com",
  "https://youtu.be",
];

/**
 * Note that this assumes we have enough HTML to extract the video, which may
 * not be true with the default settings. Currently, this is only used on the
 * best-of page where we use a custom query to ensure we fetch enough HTML.
 */
export const getPostVideoAttributes = (post: PostListItem) => {
  const html = post.contents?.htmlHighlight;
  if (!html) {
    return null;
  }
  const $ = cheerioLoad(html);
  const iframes = $("iframe").toArray();
  for (const iframe of iframes) {
    if ("attribs" in iframe) {
      const src = iframe.attribs.src ?? "";
      for (const host of videoHosts) {
        if (src.indexOf(host) === 0) {
          return iframe.attribs;
        }
      }
    }
  }
  return null;
};
