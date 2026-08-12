import type { Metadata } from "next";
import { z } from "zod/v4";
import { combineUrls, getSiteUrl } from "../routeHelpers";
import {
  getSiteOgImageUrl,
  getSocialImagePreviewPrefix,
} from "../cloudinary/cloudinaryHelpers";

/**
 * A "sequence event" is a standalone landing page for a single sequence, with
 * its own URL and colour scheme, rendered by
 * `@/components/SequenceEventPage/SequenceEventPage`.
 *
 * Pages come from two places:
 * - Pages with a vanity URL are defined in code below, with their own route
 *   under `src/app` and their path registered in `newSitePatterns` in
 *   `@/lib/proxy/legacySiteRedirect`.
 * - Pages created by admins at `/admin/sequence-events` are stored in the
 *   database and served from `/series/<slug>`.
 */
export interface SequenceEventConfig {
  /** Path of the standalone page, with a leading slash */
  path: string;
  sequenceId: string;
  /** Page title. The sequence's own title is used for the on-page heading */
  title: string;
  description: string;
  socialImageUrl: string;
  /** `pageContext` for analytics events fired from the page */
  analyticsPageContext: string;
  /** `utm_campaign` used by the share menu */
  shareCampaign: string;
  /** Optional podcast/playlist link, shown as "Listen to the posts" */
  listenUrl?: string;
  /** Header and read-post background, exposed as `--sequence-theme` */
  themeColor: string;
  /** Hover background, exposed as `--sequence-hover` */
  hoverColor: string;
  /** Text colour, exposed as `--sequence-text`. Defaults to black */
  textColor?: string;
  /**
   * "score" keeps the first post of the sequence pinned first and orders the
   * rest by karma, "sequence" keeps the order the posts have in the sequence.
   */
  postOrder: "score" | "sequence";
}

export const scalingSeriesEvent: SequenceEventConfig = {
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
  postOrder: "score",
};

/** Pages defined in code, each with their own route and vanity URL */
const codeSequenceEvents: SequenceEventConfig[] = [scalingSeriesEvent];

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour");

export const SEQUENCE_EVENT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * An admin-created page, as stored in the database. Slugs are restricted to
 * lowercase words separated by single hyphens, both because they're part of a
 * URL and because `newSitePatterns` matches `/series/<slug>` with a regex.
 */
export const sequenceEventPageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      SEQUENCE_EVENT_SLUG_PATTERN,
      "Use lowercase letters, numbers and single hyphens",
    ),
  sequenceId: z.string().min(1).max(27),
  title: z.string().min(1).max(300),
  description: z.string().max(1000),
  /** Cloudinary id of the social preview image, if one was uploaded */
  socialImageId: z.string().max(300).nullable(),
  listenUrl: z.union([z.literal(""), z.url().max(1000)]),
  themeColor: colorSchema,
  hoverColor: colorSchema,
  textColor: colorSchema,
  postOrder: z.enum(["score", "sequence"]),
  /** Unpublished pages are only visible to admins */
  published: z.boolean(),
});

export type SequenceEventPage = z.infer<typeof sequenceEventPageSchema>;

export const sequenceEventPagePath = (slug: string) => `/series/${slug}`;

export const newSequenceEventPage = (): SequenceEventPage => ({
  slug: "",
  sequenceId: "",
  title: "",
  description: "",
  socialImageId: null,
  listenUrl: "",
  themeColor: "#b8a0ff",
  hoverColor: "#f8f5ff",
  textColor: "#000000",
  postOrder: "score",
  published: false,
});

export const sequenceEventConfigFromPage = (
  page: SequenceEventPage,
): SequenceEventConfig => ({
  path: sequenceEventPagePath(page.slug),
  sequenceId: page.sequenceId,
  title: page.title,
  description: page.description,
  socialImageUrl: page.socialImageId
    ? getSocialImagePreviewPrefix() + page.socialImageId
    : getSiteOgImageUrl(),
  analyticsPageContext: "sequenceEvent",
  shareCampaign: page.slug.replace(/-/g, "_"),
  listenUrl: page.listenUrl || undefined,
  themeColor: page.themeColor,
  hoverColor: page.hoverColor,
  textColor: page.textColor,
  postOrder: page.postOrder,
});

/**
 * Sequences with a vanity landing page are linked to by that page's path. This
 * is deliberately limited to pages defined in code, so that linking to a
 * sequence stays synchronous.
 */
export const getSequenceEventBySequenceId = (
  sequenceId: string,
): SequenceEventConfig | null =>
  codeSequenceEvents.find((event) => event.sequenceId === sequenceId) ?? null;

export const sequenceEventUrl = (config: SequenceEventConfig) =>
  combineUrls(getSiteUrl(), config.path);

export const sequenceEventMetadata = (config: SequenceEventConfig): Metadata => {
  const url = sequenceEventUrl(config);
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
