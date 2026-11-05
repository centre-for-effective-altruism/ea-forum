import type { Metadata } from "next";
import orderBy from "lodash/orderBy";
import { combineUrls, getSiteUrl } from "../routeHelpers";
import { isNoIndexSite } from "../environment";

export type SequenceEventPostOrder = "score" | "sequence";

export type SequenceEvent = {
  sequenceId: string;
  path: string;
  title: string;
  shareTitle?: string;
  description: string;
  imageUrl: string;
  pageContext: string;
  campaign: string;
  themeColor: string;
  hoverColor: string;
  order: SequenceEventPostOrder;
  listenUrl?: string;
};

export const betterFuturesEvent: SequenceEvent = {
  sequenceId: "wwqGaWf76xgzDaFes",
  path: "/better-futures",
  title: "Better Futures",
  description:
    'To make the future go better, we can either work to avoid near-term catastrophes like human extinction or improve the futures where we survive. This series from Forethought explores that second option. The essays are designed to be read in order, beginning with "Introducing Better Futures".',
  imageUrl:
    "https://res.cloudinary.com/cea/image/upload/v1776673811/SocialPreview/betterfutures.png",
  pageContext: "betterFutures",
  campaign: "better_futures",
  themeColor: "#EF7948",
  hoverColor: "#FFF1EE",
  order: "sequence",
};

export const scalingSeriesEvent: SequenceEvent = {
  sequenceId: "HvynzLsZDJm4vS2gL",
  path: "/scaling-series",
  title: "The Scaling Series",
  description:
    "Toby Ord's analysis of why AI scaling costs are exploding while returns diminish, and what that means for the future.",
  imageUrl:
    "https://res.cloudinary.com/cea/image/upload/v1769778867/Grid/lxzkgegdmfwdstr1pfzz.png",
  pageContext: "scalingSeries",
  campaign: "scaling_series",
  themeColor: "#b8a0ff",
  hoverColor: "#f8f5ff",
  order: "score",
  listenUrl:
    "https://open.spotify.com/playlist/6xFKOOKfOu52pzWXeh4u5r?si=c71ac51c39a84e73",
};

export const inDevelopmentEvent: SequenceEvent = {
  sequenceId: "ryDBPmRxdYbakxsgR",
  path: "/in-development-highlight",
  title: "In Development Highlight",
  description:
    "This week the EA Forum is crossposting the launch articles from In Development magazine.",
  imageUrl:
    "https://res.cloudinary.com/cea/image/upload/v1778150192/SocialPreview/in_development.jpg",
  pageContext: "inDevelopment",
  campaign: "in-development",
  themeColor: "#67ADB8",
  hoverColor: "#f8f5ff",
  order: "score",
};

export const marginalFundingEvent: SequenceEvent = {
  sequenceId: "jTAPdwYry3zTyifkZ",
  path: "/marginal-funding",
  title: "Marginal funding",
  shareTitle: "Marginal Funding Week",
  description: "What will effective charities actually do with your money?",
  imageUrl:
    "https://res.cloudinary.com/cea/image/upload/v1763462529/SocialPreview/og-marginal-funding.jpg",
  pageContext: "marginalFunding",
  campaign: "marginal_funding",
  themeColor: "#FF7454",
  hoverColor: "#FFF1EE",
  order: "score",
  listenUrl:
    "https://open.spotify.com/playlist/2wEYoo2FtV7OQQA0pATewT?si=XET3lr9aT9S-PFOGDvW6Kw",
};

export const sequenceEvents = [
  betterFuturesEvent,
  scalingSeriesEvent,
  inDevelopmentEvent,
  marginalFundingEvent,
];

export const orderSequenceEventPosts = <T extends { baseScore: number }>(
  posts: T[],
  order: SequenceEventPostOrder,
): T[] => {
  if (order === "sequence" || posts.length === 0) {
    return posts;
  }
  const [firstPost, ...rest] = posts;
  return [firstPost, ...orderBy(rest, "baseScore", "desc")];
};

export const getSequenceEventMetadata = ({
  path,
  title,
  description,
  imageUrl,
}: SequenceEvent): Metadata => {
  const canonicalUrl = combineUrls(getSiteUrl(), path);
  return {
    title,
    description,
    robots: isNoIndexSite ? "noindex" : undefined,
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      images: imageUrl,
    },
    twitter: {
      description,
      images: imageUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
};
