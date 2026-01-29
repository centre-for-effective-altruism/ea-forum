import { containsKana, fromKana } from "hepburn";
import getSlug from "speakingurl";

export const slugify = (s: string): string => {
  if (containsKana(s)) {
    s = fromKana(s);
  }

  const slug = getSlug(s, { truncate: 60 });

  // Can't have posts with an "edit" slug
  if (slug === "edit") {
    return "edit-1";
  }

  // If there is nothing in the string that can be slugified, just call it unicode
  if (slug === "") {
    return "unicode";
  }

  return slug;
};
