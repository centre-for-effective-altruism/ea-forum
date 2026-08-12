import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "../routeHelpers";

/**
 * A "sequence event" is a standalone landing page for a single sequence, with
 * its own URL and colour scheme, rendered by
 * `@/components/SequenceEventPage/SequenceEventPage`.
 *
 * Adding a page means adding a config here, adding a `page.tsx` under
 * `src/app/<path>` that renders it, and registering the path in
 * `newSitePatterns` in `@/lib/proxy/legacySiteRedirect`.
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

const sequenceEvents: SequenceEventConfig[] = [scalingSeriesEvent];

/**
 * Sequences with their own landing page are linked to by that page's path
 * rather than by `/s/<id>`.
 */
export const getSequenceEventBySequenceId = (
  sequenceId: string,
): SequenceEventConfig | null =>
  sequenceEvents.find((event) => event.sequenceId === sequenceId) ?? null;

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
