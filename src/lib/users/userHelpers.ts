import type { ICurrentUser } from "./userQueries.schemas";

export const userGetProfileUrl = ({ slug }: { slug: string | null }) =>
  slug ? `/users/${slug}` : "#";

export const userGetStatsUrl = ({ slug }: Pick<ICurrentUser, "slug">) =>
  `/users/${slug}/stats`;

type CareerStageValue =
  | "highSchool"
  | "associateDegree"
  | "undergradDegree"
  | "professionalDegree"
  | "graduateDegree"
  | "doctoralDegree"
  | "otherDegree"
  | "earlyCareer"
  | "midCareer"
  | "lateCareer"
  | "seekingWork"
  | "retired";

type EAGCareerStage =
  | "Student (high school)"
  | "Pursuing an associates degree"
  | "Pursuing an undergraduate degree"
  | "Pursuing a professional degree"
  | "Pursuing a graduate degree (e.g. Masters)"
  | "Pursuing a doctoral degree (e.g. PhD)"
  | "Pursuing other degree/diploma"
  | "Working (0-5 years of experience)"
  | "Working (6-15 years of experience)"
  | "Working (15+ years of experience)"
  | "Not employed, but looking"
  | "Retired";

export type CareerStage = {
  value: CareerStageValue;
  label: string;
  icon: string; // TODO: This used to be ForumIconName which no longer exists
  eagLabel: EAGCareerStage;
};

export const userCareerStages: CareerStage[] = [
  {
    value: "highSchool",
    label: "In high school",
    icon: "School",
    eagLabel: "Student (high school)",
  },
  {
    value: "associateDegree",
    label: "Pursuing an associate's degree",
    icon: "School",
    eagLabel: "Pursuing an associates degree",
  },
  {
    value: "undergradDegree",
    label: "Pursuing an undergraduate degree",
    icon: "School",
    eagLabel: "Pursuing an undergraduate degree",
  },
  {
    value: "professionalDegree",
    label: "Pursuing a professional degree",
    icon: "School",
    eagLabel: "Pursuing a professional degree",
  },
  {
    value: "graduateDegree",
    label: "Pursuing a graduate degree (e.g. Master's)",
    icon: "School",
    eagLabel: "Pursuing a graduate degree (e.g. Masters)",
  },
  {
    value: "doctoralDegree",
    label: "Pursuing a doctoral degree (e.g. PhD)",
    icon: "School",
    eagLabel: "Pursuing a doctoral degree (e.g. PhD)",
  },
  {
    value: "otherDegree",
    label: "Pursuing other degree/diploma",
    icon: "School",
    eagLabel: "Pursuing other degree/diploma",
  },
  {
    value: "earlyCareer",
    label: "Working (0-5 years)",
    icon: "Work",
    eagLabel: "Working (0-5 years of experience)",
  },
  {
    value: "midCareer",
    label: "Working (6-15 years)",
    icon: "Work",
    eagLabel: "Working (6-15 years of experience)",
  },
  {
    value: "lateCareer",
    label: "Working (15+ years)",
    icon: "Work",
    eagLabel: "Working (6-15 years of experience)",
  },
  {
    value: "seekingWork",
    label: "Seeking work",
    icon: "Work",
    eagLabel: "Not employed, but looking",
  },
  {
    value: "retired",
    label: "Retired",
    icon: "Work",
    eagLabel: "Retired",
  },
];
