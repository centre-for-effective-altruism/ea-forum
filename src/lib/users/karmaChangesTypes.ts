type ReactionChange = {
  _id: string;
  displayName: string;
  slug: string;
};

export type PostKarmaChange = {
  _id: string;
  collectionName: string;
  scoreChange: number;
  postId: string;
  title: string | null;
  slug: string;
  addedReacts: Record<string, ReactionChange[]>;
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
  tagCommentType: string | null;
  tagId: string | null;
  addedReacts: Record<string, ReactionChange[]>;
};

export type RevisionsKarmaChange = {
  _id: string;
  collectionName: string;
  scoreChange: number;
  tagId: string | null;
  tagSlug: string | null;
  tagName: string | null;
  addedReacts: Record<string, ReactionChange[]>;
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

export type KarmaChangeSettings = {
  updateFrequency: "disabled" | "daily" | "weekly" | "realtime";
  timeOfDayGMT: number;
  dayOfWeekGMT:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
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
  updateFrequency: KarmaChangeSettings["updateFrequency"];
  todaysKarmaChanges: KarmaChanges | null;
  thisWeeksKarmaChanges: KarmaChanges | null;
};
