import type { CurrentUser } from "@/lib/users/currentUser";
import type { Comment } from "@/lib/schema";
import { userIsAdmin } from "../users/userHelpers";

export type SortableComment = Pick<
  Comment,
  "score" | "baseScore" | "postedAt" | "lastSubthreadActivity" | "deleted"
>;

const commentSortings = {
  newAndUpvoted: {
    label: "New & upvoted",
    adminOnly: false,
    compare: (a, b) => b.score - a.score,
  },
  top: {
    label: "Top",
    adminOnly: false,
    compare: (a, b) => b.baseScore - a.baseScore,
  },
  new: {
    label: "New",
    adminOnly: false,
    compare: (a, b) =>
      new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  },
  old: {
    label: "Old",
    adminOnly: false,
    compare: (a, b) =>
      new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime(),
  },
  latestReply: {
    label: "Latest reply",
    adminOnly: false,
    compare: (a, b) => {
      const aTime = a.lastSubthreadActivity
        ? new Date(a.lastSubthreadActivity).getTime()
        : new Date(a.postedAt).getTime();
      const bTime = b.lastSubthreadActivity
        ? new Date(b.lastSubthreadActivity).getTime()
        : new Date(b.postedAt).getTime();
      return bTime - aTime;
    },
  },
  deleted: {
    label: "Deleted",
    adminOnly: true,
    compare: (a, b) => {
      if (a.deleted !== b.deleted) {
        return a.deleted ? -1 : 1;
      }
      return 0;
    },
  },
} as const satisfies Record<
  string,
  {
    label: string;
    adminOnly: boolean;
    compare: (a: SortableComment, b: SortableComment) => number;
  }
>;

export type CommentSorting = keyof typeof commentSortings;

export const defaultCommentSorting: CommentSorting = "newAndUpvoted";

export const getCommentSortings = (currentUser: CurrentUser | null) => {
  const sortings = Object.keys(commentSortings) as CommentSorting[];
  return userIsAdmin(currentUser)
    ? sortings
    : sortings.filter((sorting) => !commentSortings[sorting].adminOnly);
};

export const getCommentSortingLabel = (sorting: CommentSorting) =>
  commentSortings[sorting].label;

export const commentSortingCompare = (
  sorting: CommentSorting,
  a: SortableComment,
  b: SortableComment,
) => commentSortings[sorting].compare(a, b);
