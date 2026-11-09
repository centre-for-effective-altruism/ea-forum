export type GivingSeasonWeekColors = {
  lead: string;
  deep: string;
  tint: string;
  strip: string;
};

export type GivingSeasonWeek = {
  id: string;
  start: Date;
  end: Date;
  bannerDate: string;
  title: string;
  description: string;
  postUrl: string;
  stripLabel: string;
  stripDate: string;
  colors: GivingSeasonWeekColors;
};

export const givingSeasonAnnouncementPostId = "yYPtDPwFhinYmGuSR";

const announcementPostUrl = `/posts/${givingSeasonAnnouncementPostId}/giving-season-on-the-forum-2026`;

export const givingSeasonGapStripColor = "#121212";

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
    colors: {
      lead: "#FF5A50",
      deep: "#2B0A08",
      tint: "#FFC7BF",
      strip: "#180604",
    },
  },
  {
    id: "fundingStrategy",
    start: new Date("2026-11-23T00:00:00Z"),
    end: new Date("2026-11-30T00:00:00Z"),
    bannerDate: "23 – 29 November",
    title: "Funding Strategy Week",
    description:
      "A week to discuss cruxy questions about funding, our joint resources, and where marginal funding should go.",
    postUrl: `${announcementPostUrl}#Funding_Strategy_Week`,
    stripLabel: "Funding Strategy",
    stripDate: "Nov 23–29",
    colors: {
      lead: "#FFCC1A",
      deep: "#2A1604",
      tint: "#FFED99",
      strip: "#170C02",
    },
  },
  {
    id: "eaAndAiDebate",
    start: new Date("2026-11-30T00:00:00Z"),
    end: new Date("2026-12-07T00:00:00Z"),
    bannerDate: "30 November – 6 December",
    title: "EA and AI: Debate Week",
    description:
      "Debating the question: what % of EA resources should go to making AI go well?",
    postUrl: `${announcementPostUrl}#EA_and_AI__Debate_Week`,
    stripLabel: "EA and AI Debate",
    stripDate: "Nov 30 – Dec 6",
    colors: {
      lead: "#4C85FF",
      deep: "#030A33",
      tint: "#ADC7FF",
      strip: "#01061C",
    },
  },
  {
    id: "whyIDonate",
    start: new Date("2026-12-14T00:00:00Z"),
    end: new Date("2026-12-21T00:00:00Z"),
    bannerDate: "14 – 20 December",
    title: "‘Why I Donate’ Week",
    description:
      "Sharing stories about what motivates us to keep donating to impactful charities.",
    postUrl: `${announcementPostUrl}#_Why_I_Donate__Week`,
    stripLabel: "Why I Donate",
    stripDate: "Dec 14–20",
    colors: {
      lead: "#38BDB5",
      deep: "#052121",
      tint: "#B8F0EB",
      strip: "#031212",
    },
  },
  {
    id: "donationCelebration",
    start: new Date("2026-12-28T00:00:00Z"),
    end: new Date("2027-01-01T00:00:00Z"),
    bannerDate: "28 December – end of year",
    title: "Donation Celebration",
    description:
      "During the week, you’ll be able to add a heart once you’ve made your last donation of the year, and tell us where you gave.",
    postUrl: `${announcementPostUrl}#Donation_Celebration`,
    stripLabel: "Donation Celebration",
    stripDate: "From Dec 28",
    colors: {
      lead: "#F9A49A",
      deep: "#2E1212",
      tint: "#FFE0D9",
      strip: "#190A0A",
    },
  },
];

export const isGivingSeasonOver = (now: Date) =>
  now >= givingSeasonWeeks[givingSeasonWeeks.length - 1].end;

export const isGivingSeasonWeekPast = (week: GivingSeasonWeek, now: Date) =>
  now >= week.end;

/**
 * Returns null during the gaps between weeks. Before the season starts the
 * first week is treated as current so that the banner can be shown early.
 */
export const getCurrentGivingSeasonWeek = (now: Date): GivingSeasonWeek | null => {
  if (now < givingSeasonWeeks[0].start) {
    return givingSeasonWeeks[0];
  }
  return (
    givingSeasonWeeks.find(({ start, end }) => now >= start && now < end) ?? null
  );
};
