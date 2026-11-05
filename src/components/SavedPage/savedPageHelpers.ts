import type { ContinueReadingItem } from "@/lib/sequences/continueReading";
import type { PostListItem } from "@/lib/posts/postLists";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { VoteHistoryItem } from "@/lib/votes/voteHistory";

export const savedPageTabs = [
  { name: "saved", label: "Saved" },
  { name: "readhistory", label: "Read history" },
  { name: "votehistory", label: "Vote history" },
] as const;

export type SavedPageTabName = (typeof savedPageTabs)[number]["name"];

export const getSavedPageTab = (tab: unknown): SavedPageTabName =>
  savedPageTabs.find(({ name }) => name === tab)?.name ?? "saved";

export const savedPageTabHref = (tab: SavedPageTabName) =>
  tab === "saved" ? "/saved" : `/saved?tab=${tab}`;

export const savedPageListLimit = 20;

export type SavedTabData = {
  continueReading: ContinueReadingItem[];
  posts: PostListItem[];
  comments: CommentListItem[];
};

export type SavedPageTabData = {
  saved: SavedTabData;
  readhistory: PostListItem[];
  votehistory: VoteHistoryItem[];
};

export type InitialSavedPageTabData = {
  [K in SavedPageTabName]: { tab: K; data: SavedPageTabData[K] };
}[SavedPageTabName];
