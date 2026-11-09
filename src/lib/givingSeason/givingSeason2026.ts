import { CookieName, HIDE_FORUM_EVENT_BANNER_PREFIX } from "../cookies/cookies";

export type GivingSeasonBannerColors = {
  deep: string;
  strip: string;
  title: string;
  date: string;
};

export type GivingSeasonWeekColors = GivingSeasonBannerColors & {
  lead: string;
  tint: string;
};

export type GivingSeasonGeneralColors = GivingSeasonBannerColors & {
  stops: [number, string][];
};

export type GivingSeasonBannerContent = {
  id: string;
  bannerDate: string;
  title: string;
  description: string;
  postUrl: string;
  colors: GivingSeasonWeekColors | GivingSeasonGeneralColors;
};

export type GivingSeasonWeek = GivingSeasonBannerContent & {
  start: Date;
  end: Date;
  stripLabel: string;
  stripDate: string;
  colors: GivingSeasonWeekColors;
};

export const givingSeasonAnnouncementPostId = "yYPtDPwFhinYmGuSR";

const announcementPostUrl = `/posts/${givingSeasonAnnouncementPostId}/giving-season-on-the-forum-2026`;

export const givingSeasonBannerDismissCookie =
  `${HIDE_FORUM_EVENT_BANNER_PREFIX}giving_season_2026` as CookieName;

const weekColors = (
  colors: Omit<GivingSeasonWeekColors, "title" | "date">,
): GivingSeasonWeekColors => ({ ...colors, title: colors.lead, date: colors.tint });

export const givingSeasonGeneralBanner: GivingSeasonBannerContent & {
  colors: GivingSeasonGeneralColors;
} = {
  id: "general",
  bannerDate: "16 November – end of year",
  title: "Giving Season 2026",
  description:
    "A series of events focused on big questions in effective giving and the EA funding ecosystem.",
  postUrl: announcementPostUrl,
  colors: {
    deep: "#0D0B10",
    strip: "#060508",
    title: "#FFFFFF",
    date: "#D9D9DE",
    stops: [
      [0, "#FF5A50"],
      [0.22, "#FFCC1A"],
      [0.48, "#4C85FF"],
      [0.72, "#38BDB5"],
      [0.95, "#F9A49A"],
    ],
  },
};

export const givingSeasonWeeks: GivingSeasonWeek[] = [
  {
    id: "marginalFunding",
    start: new Date("2026-11-16T00:00:00Z"),
    end: new Date("2026-11-23T00:00:00Z"),
    bannerDate: "16 – 22 November",
    title: "Marginal Funding Week",
    description:
      "EA organisations share their funding gaps, and what they could do with extra funding.",
    postUrl: `${announcementPostUrl}#Marginal_Funding_Week`,
    stripLabel: "Marginal Funding",
    stripDate: "Nov 16–22",
    colors: weekColors({
      lead: "#FF5A50",
      deep: "#2B0A08",
      tint: "#FFC7BF",
      strip: "#180604",
    }),
  },
  {
    id: "fundingStrategy",
    start: new Date("2026-11-23T00:00:00Z"),
    end: new Date("2026-11-30T00:00:00Z"),
    bannerDate: "23 – 29 November",
    title: "Funding Strategy Week",
    description:
      "A week to discuss cruxy questions about how EA resources are being spent, and how they should be.",
    postUrl: `${announcementPostUrl}#Funding_Strategy_Week`,
    stripLabel: "Funding Strategy",
    stripDate: "Nov 23–29",
    colors: weekColors({
      lead: "#FFCC1A",
      deep: "#2A1604",
      tint: "#FFED99",
      strip: "#170C02",
    }),
  },
  {
    id: "eaAndAiDebate",
    start: new Date("2026-11-30T00:00:00Z"),
    end: new Date("2026-12-07T00:00:00Z"),
    bannerDate: "30 November – 6 December",
    title: "EA and AI: Debate Week",
    description:
      "A debate week on the question: what % of EA resources should go to making AI go well?",
    postUrl: `${announcementPostUrl}#EA_and_AI__Debate_Week`,
    stripLabel: "EA and AI Debate",
    stripDate: "Nov 30 – Dec 6",
    colors: weekColors({
      lead: "#4C85FF",
      deep: "#030A33",
      tint: "#ADC7FF",
      strip: "#01061C",
    }),
  },
  {
    id: "whyIDonate",
    start: new Date("2026-12-14T00:00:00Z"),
    end: new Date("2026-12-21T00:00:00Z"),
    bannerDate: "14 – 20 December",
    title: "‘Why I Donate’ Week",
    description: "Writing about why we donate to impactful charities.",
    postUrl: `${announcementPostUrl}#_Why_I_Donate__Week`,
    stripLabel: "Why I Donate",
    stripDate: "Dec 14–20",
    colors: weekColors({
      lead: "#38BDB5",
      deep: "#052121",
      tint: "#B8F0EB",
      strip: "#031212",
    }),
  },
  {
    id: "donationCelebration",
    start: new Date("2026-12-28T00:00:00Z"),
    end: new Date("2027-01-01T00:00:00Z"),
    bannerDate: "28 December – end of year",
    title: "Donation Celebration",
    description: "A week to publicly celebrate our year’s donations.",
    postUrl: `${announcementPostUrl}#Donation_Celebration`,
    stripLabel: "Donation Celebration",
    stripDate: "From Dec 28",
    colors: weekColors({
      lead: "#F9A49A",
      deep: "#2E1212",
      tint: "#FFE0D9",
      strip: "#190A0A",
    }),
  },
];

export const isGivingSeasonOver = (now: Date) =>
  now >= givingSeasonWeeks[givingSeasonWeeks.length - 1].end;

export const isGivingSeasonWeekPast = (week: GivingSeasonWeek, now: Date) =>
  now >= week.end;

/** Returns null before the season starts and during the gaps between weeks */
export const getCurrentGivingSeasonWeek = (now: Date): GivingSeasonWeek | null => {
  return (
    givingSeasonWeeks.find(({ start, end }) => now >= start && now < end) ?? null
  );
};
