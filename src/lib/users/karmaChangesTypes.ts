import type { TagCommentType } from "../tags/tagHelpers";

export type ReactionChange =
  | number
  | {
      _id: string;
      displayName: string;
      slug: string;
    }[];

export type PostKarmaChange = {
  _id: string;
  collectionName: string;
  scoreChange: number;
  postId: string;
  title: string | null;
  slug: string;
  addedReacts: Record<string, ReactionChange>;
};

export type CommentKarmaChange = {
  _id: string;
  collectionName: string;
  scoreChange: number;
  commentId: string | null;
  description: string | null;
  postId: string | null;
  postTitle: string | null;
  postSlug: string | null;
  tagSlug: string | null;
  tagName: string | null;
  tagCommentType: TagCommentType | null;
  tagId: string | null;
  addedReacts: Record<string, ReactionChange>;
};

export type RevisionsKarmaChange = {
  _id: string;
  collectionName: string;
  scoreChange: number;
  tagId: string | null;
  tagSlug: string | null;
  tagName: string | null;
  addedReacts: Record<string, ReactionChange>;
};

export type AnyKarmaChange =
  | PostKarmaChange
  | CommentKarmaChange
  | RevisionsKarmaChange;

export type KarmaChanges = {
  posts: PostKarmaChange[];
  comments: CommentKarmaChange[];
  tagRevisions: RevisionsKarmaChange[];
};

export type KarmaChangeUpdateFrequency =
  | "disabled"
  | "daily"
  | "weekly"
  | "realtime";

export type KarmaChangeDayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type KarmaChangeSettings = {
  updateFrequency: KarmaChangeUpdateFrequency;
  timeOfDayGMT: number;
  dayOfWeekGMT: KarmaChangeDayOfWeek;
  showNegativeKarma: boolean;
};

export const defaultKarmaChangeSettings: KarmaChangeSettings = {
  updateFrequency: "daily",
  timeOfDayGMT: 11,
  dayOfWeekGMT: "Saturday",
  showNegativeKarma: false,
};

export type UserKarmaChanges = KarmaChanges & {
  totalChange: number;
  startDate: Date;
  endDate: Date;
  nextBatchDate: Date | null;
  updateFrequency: KarmaChangeUpdateFrequency;
  todaysKarmaChanges: KarmaChanges | null;
  thisWeeksKarmaChanges: KarmaChanges | null;
};
