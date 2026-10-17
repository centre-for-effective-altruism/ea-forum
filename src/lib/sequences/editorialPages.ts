import type { Metadata } from "next";
import { z } from "zod/v4";
import { combineUrls, getSiteUrl } from "../routeHelpers";
import {
  getSiteOgImageUrl,
  getSocialImagePreviewPrefix,
} from "../cloudinary/cloudinaryHelpers";
import {
  editorialPagePath,
  editorialPageSlugRegex,
  isReservedEditorialPageSlug,
} from "./editorialPagePaths";

/**
 * An editorial page is a standalone page for a single sequence, with its own
 * URL and colour scheme, rendered by
 * `@/components/EditorialPage/EditorialPageDisplay`.
 *
 * Pages come from two places:
 * - Pages with a vanity URL are defined in code below, with their own route
 *   under `src/app` and their path registered in `newSitePatterns` in
 *   `@/lib/proxy/legacySiteRedirect`.
 * - Pages created by admins at `/admin/editorial-pages` are stored in the
 *   database and served from `/<slug>`, which the proxy rewrites to the
 *   `/series/<slug>` route.
 */
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour");

/**
 * An admin-created page, as stored in the database. Slugs are restricted to
 * lowercase words separated by single hyphens, both because they become a top
 * level URL and because the proxy matches them with a regex.
 */
export const editorialPageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      editorialPageSlugRegex,
      "Use lowercase letters, numbers and single hyphens",
    )
    .refine(
      (slug) => !isReservedEditorialPageSlug(slug),
      "Something on the Forum already answers at that URL",
    ),
  sequenceId: z.string().min(1).max(27),
  /** Page title. The sequence's own title is used for the on-page heading */
  title: z.string().min(1).max(300),
  description: z.string().max(1000),
  /** Cloudinary id of the social preview image, if one was uploaded */
  socialImageId: z.string().max(300).nullable(),
  /** Optional podcast/playlist link, shown as "Listen to the posts" */
  listenUrl: z.union([z.literal(""), z.url().max(1000)]),
  /** Header and read-post background, exposed as `--editorial-theme` */
  themeColor: colorSchema,
  /** Hover background, exposed as `--editorial-hover` */
  hoverColor: colorSchema,
  /** Text colour, exposed as `--editorial-text` */
  textColor: colorSchema,
  /**
   * "score" keeps the first post of the sequence pinned first and orders the
   * rest by karma, "sequence" keeps the order the posts have in the sequence.
   */
  postOrder: z.enum(["score", "sequence"]),
  /** Unpublished pages are only visible to admins */
  published: z.boolean(),
});

export type EditorialPage = z.infer<typeof editorialPageSchema>;

/**
 * What the renderer needs, which is everything about a page except where it's
 * stored: the same fields whether the page came from the database or from code.
 */
export interface EditorialPageConfig extends Omit<
  EditorialPage,
  "slug" | "socialImageId" | "published"
> {
  /** Path of the page, with a leading slash */
  path: string;
  socialImageUrl: string;
  /** `pageContext` for analytics events fired from the page */
  analyticsPageContext: string;
  /** `utm_campaign` used by the share menu */
  shareCampaign: string;
}

export const scalingSeriesPage: EditorialPageConfig = {
  path: "/scaling-series",
  sequenceId: "HvynzLsZDJm4vS2gL",
  title: "The Scaling Series",
  description:
    "Toby Ord's analysis of why AI scaling costs are exploding while returns diminish, and what that means for the future.",
  socialImageUrl:
    "https://res.cloudinary.com/cea/image/upload/v1769778867/Grid/lxzkgegdmfwdstr1pfzz.png",
  analyticsPageContext: "scalingSeries",
  shareCampaign: "scaling_series",
  listenUrl:
    "https://open.spotify.com/playlist/6xFKOOKfOu52pzWXeh4u5r?si=c71ac51c39a84e73",
  themeColor: "#b8a0ff",
  hoverColor: "#f8f5ff",
  textColor: "#000000",
  postOrder: "score",
};

/** Pages defined in code, each with their own route and vanity URL */
export const codeEditorialPages: EditorialPageConfig[] = [scalingSeriesPage];

export const newEditorialPage = (): EditorialPage => ({
  slug: "",
  sequenceId: "",
  title: "",
  description: "",
  socialImageId: null,
  listenUrl: "",
  themeColor: "#ffffff",
  hoverColor: "#f5f5f5",
  textColor: "#000000",
  postOrder: "score",
  published: false,
});

export const editorialPageConfig = (page: EditorialPage): EditorialPageConfig => ({
  ...page,
  path: editorialPagePath(page.slug),
  socialImageUrl: page.socialImageId
    ? getSocialImagePreviewPrefix() + page.socialImageId
    : getSiteOgImageUrl(),
  analyticsPageContext: "editorialPage",
  shareCampaign: page.slug.replace(/-/g, "_"),
});

/**
 * Sequences with a vanity editorial page are linked to by that page's path.
 * This is deliberately limited to pages defined in code, so that linking to a
 * sequence stays synchronous.
 */
export const getEditorialPageForSequence = (
  sequenceId: string,
): EditorialPageConfig | null =>
  codeEditorialPages.find((page) => page.sequenceId === sequenceId) ?? null;

export const editorialPageUrl = (config: EditorialPageConfig) =>
  combineUrls(getSiteUrl(), config.path);

export const editorialPageMetadata = (config: EditorialPageConfig): Metadata => {
  const url = editorialPageUrl(config);
  return {
    title: config.title,
    description: config.description,
    openGraph: {
      type: "website",
      url,
      title: config.title,
      description: config.description,
      images: config.socialImageUrl,
    },
    twitter: {
      description: config.description,
      images: config.socialImageUrl,
    },
    alternates: {
      canonical: url,
    },
  };
};
