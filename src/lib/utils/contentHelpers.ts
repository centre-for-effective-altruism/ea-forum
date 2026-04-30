import { captureException } from "@sentry/nextjs";
import { CSSProperties } from "react";

const tryToFixUrl = (oldUrl: string, newUrl: string) => {
  try {
    // Only return the edited version if this actually fixed the problem
    new URL(newUrl);
    return newUrl;
  } catch {
    return oldUrl;
  }
};

export const validateUrl = (url: string) => {
  try {
    // This will validate the URL - importantly, it will fail if the
    // protocol is missing
    new URL(url);
  } catch {
    if (url.search(/[^@]+@[^.]+\.[^\n\r\f]+$/) === 0) {
      // Add mailto: to email addresses
      return tryToFixUrl(url, `mailto:${url}`);
    } else if (url.search(/\/.*/) === 0) {
      // This is probably _meant_ to be relative. We could prepend the
      // siteUrl from instanceSettings, but this seems unnecessarily
      // risky - let's just do nothing.
    } else if (url.search(/(https?:)?\/\//) !== 0) {
      // Add https:// to anything else
      return tryToFixUrl(url, `https://${url}`);
    }
  }

  return url;
};

/**
 * Mapping from HTML attribute names as they appear in HTML, to attribute names as React
 * wants them (ie, with camel-casing). Missing mappings will cause warnings from React,
 *  which look like:
 *   ```Invalid DOM property `allowfullscreen`. Did you mean `allowFullScreen`?```
 * Which don't break anything important but are spammy.
 */
const mapAttributeNames: Record<string, string> = {
  srcset: "srcSet",
  class: "className",
  colspan: "colSpan",
  columnspan: "columnSpan",
  rowspan: "rowSpan",
  allowfullscreen: "allowFullScreen",
  for: "htmlFor",
};

const camelCaseCssAttribute = (input: string) =>
  input.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

const parseInlineStyle = (input: string): CSSProperties => {
  return input.split(";").reduce((obj, kv) => {
    let [key, val] = kv.split(":");
    key = key?.trim();
    val = val?.trim();
    if (key && val) {
      // @ts-expect-error This is tricky to type
      obj[camelCaseCssAttribute(key) as keyof CSSProperties] = val;
    }
    return obj;
  }, {} as CSSProperties);
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type TranslatedAttribs = Record<string, string | CSSProperties | Function>;

/**
 * Translate an attributes-dict from parsed HTML into something that can be
 * passed to React. In particular, if there's a `style` attribute, it will be
 * a string that needs to be converted into `CSSProperties` (a k-v dict); and,
 * if there's an attribute which React knows by a different name, apply the
 * inverse mapping, ie class->className, srcset->srcSet.
 *
 * This is NOT a sanitization/validation function. The expectation is that the
 * HTML was validated before it was passed to ContentItemBody and parsed.
 */
export const translateAttribs = (
  attribs: Record<string, string>,
): TranslatedAttribs => {
  const attribsCopy: TranslatedAttribs = { ...attribs };
  if ("style" in attribsCopy) {
    attribsCopy.style = parseInlineStyle(attribs.style);
  }

  // These two are used in the custom Bayes Rule Guide html.
  // Using `new Function` seemed safer than `eval`.
  if ("onclick" in attribsCopy) {
    try {
      attribsCopy.onClick = new Function(attribsCopy.onclick as string);
      delete attribsCopy.onclick;
    } catch (e) {
      const err = e as Error;
      captureException(
        `Error parsing onclick attribute in ContentItemBody.  Original function string: ${attribsCopy.onclick}.  Error: ${err.message}`,
      );
      console.error("Error parsing onclick attribute", e);
    }
  }
  if ("onchange" in attribsCopy) {
    try {
      attribsCopy.onChange = new Function(attribsCopy.onchange as string);
      delete attribsCopy.onchange;
    } catch (e) {
      const err = e as Error;
      captureException(
        `Error parsing onchange attribute in ContentItemBody.  Original function string: ${attribsCopy.onchange}.  Error: ${err.message}`,
      );
      console.error("Error parsing onchange attribute", e);
    }
  }

  for (const attribKey of Object.keys(attribsCopy)) {
    if (attribKey in mapAttributeNames) {
      attribsCopy[mapAttributeNames[attribKey]] = attribsCopy[attribKey];
      delete attribsCopy[attribKey];
    }
  }
  return attribsCopy;
};

export const locationHashIsFootnote = (hash: string) =>
  hash.startsWith("#fn") && !hash.startsWith("#fnref");

export const locationHashIsFootnoteBackreference = (hash: string) =>
  hash.startsWith("#fnref");
