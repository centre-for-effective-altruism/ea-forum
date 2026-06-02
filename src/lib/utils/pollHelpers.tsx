import type { ReactNode } from "react";
import type { ForumEventSticker } from "../forumEvents/forumEventHelpers";
import type { ForumEventBase } from "../forumEvents/forumEventQueries";
import type { CommentListItem } from "../comments/commentLists";
import type { CurrentUser } from "../users/currentUser";
import type { UserBase } from "../users/userQueries";
import type { AnyNode } from "domhandler";
import { load as cheerioLoad } from "cheerio";
import { postGetPageUrl } from "../posts/postsHelpers";
import sortBy from "lodash/sortBy";
import range from "lodash/range";
import Tooltip from "@/components/Tooltip";
import Link from "@/components/Link";

export const NUM_TICKS = 21;

const footnotesToTooltips = ({ html, event }: {
  html: string;
  event: ForumEventBase;
}): ReactNode[] => {
  const $ = cheerioLoad(html);
  const footnotesMap: Record<string, string> = {};

  $(".footnote-item").each((_, el) => {
    const footnoteId = $(el).attr("data-footnote-id");
    if (footnoteId) {
      footnotesMap[footnoteId] = $(el).find(".footnote-content").html() ?? "";
    }
  });

  // Remove the footnotes block from the DOM so we don't flatten it
  $(".footnotes").remove();

  const resultArray: ReactNode[] = [];

  const walkNode = (node: AnyNode): void => {
    // If text then just push its content, dropping the specific html tag etc
    if (node.type === "text") {
      const text = $(node).text();
      if (text.trim()) {
        resultArray.push(text);
      }
      return;
    }

    if (node.type !== "tag") {
      return;
    }

    const $node = $(node);

    // If it's a .footnote-reference, produce a <Tooltip />
    if ($node.hasClass("footnote-reference")) {
      const footnoteId = $node.attr("data-footnote-id") ?? "";
      const content = footnotesMap[footnoteId] ?? "";
      const footnoteNumber = $node.text().trim().replace(/[^\d]+/g, "") || "?";
      resultArray.push(
        <Tooltip
          key={footnoteNumber}
          title={<div dangerouslySetInnerHTML={{ __html: content }} />}
        >
          <span
            className="text-[20px] align-super"
            style={{ color: event.contrastColor ?? event.darkColor }}
          >
            {footnoteNumber}
          </span>
        </Tooltip>
      );
      return;
    }

    $node.contents().toArray().forEach(walkNode);
  };

  $.root().contents().toArray().forEach(walkNode);
  return resultArray;
};

export const createQuestionNode = (
  event: ForumEventBase | null | undefined,
) => {
  if (!event?.pollQuestion?.html) {
    return null;
  }
  const questionNode = footnotesToTooltips({
    html: event.pollQuestion.html,
    event,
  });
  return event.post
    ? (
      <Link href={postGetPageUrl({ post: event.post })}>
        {questionNode}
      </Link>
    )
    : questionNode;
}

/**
 * Removes any footnotes and converts what remains to plain text. Only tested
 * against basic html as this is designed for ForumEvent poll questions (which
 * are generally 1 sentence with optional footnotes).
 */
export const stripFootnotes = (html: string): string => {
  const $ = cheerioLoad(html);
  // Remove every footnote reference
  $(".footnote-reference").remove();
  // Remove the entire .footnotes block (where the list of footnotes usually lives)
  $(".footnotes").remove();
  return $.root().text().trim();
}

/**
 * Examples: "3 days", "1 day, 12 hours" (because <2 days), "3 hours",
 * "1 hour, 12 mins"
 */
export const formatRemainingTime = (remainingMs: number): string => {
  if (remainingMs <= 0) {
    return "closed";
  }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  if (days >= 2) {
    return `${days} days`;
  }

  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days >= 1) {
    return `${days} day, ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  if (hours >= 2) {
    return `${hours} hours`;
  }

  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) {
    return `${hours} hour, ${minutes} min${minutes !== 1 ? 's' : ''}`;
  }

  if (minutes >= 2) {
    return `${minutes} mins`;
  }

  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
  if (minutes >= 1) {
    return `${minutes} min, ${seconds}s`;
  }
  return `${seconds}s`;
}

export type ForumEventVoteDisplay = {
  x: number,
  user: UserBase,
  comment: CommentListItem | null,
}

type ForumEventVoteDisplayCluster = {
  center: number,
  votes: ForumEventVoteDisplay[]
}

/**
 * Groups the given forum event votes into NUM_TICKS equal-width clusters
 */
export const clusterForumEventVotes = ({
  voters,
  comments,
  event,
  currentUser,
}: {
  voters: UserBase[] | null;
  comments: CommentListItem[] | null;
  event: ForumEventBase | null | undefined;
  currentUser: CurrentUser | null;
}): ForumEventVoteDisplayCluster[] => {
  if (!voters || !event || !event.publicData) {
    return [];
  }

  const publicData = event.publicData as Record<string, ForumEventSticker>;
  const votes = sortBy(voters
    .filter((voter) => publicData[voter._id]?.x !== null &&
      publicData[voter._id]?.x !== undefined)
    .map((voter) => {
      const vote = publicData[voter._id].x as number;
      return {
        x: vote,
        user: voter,
        // O(n^2), but unlikely to be a problem given the numbers involved
        comment: comments?.find(comment => comment.user?._id === voter._id) || null
      };
    }), "x");

  const clusters: ForumEventVoteDisplayCluster[] = range(0, NUM_TICKS).map((i) => ({
    center: i / (NUM_TICKS - 1),
    votes: [],
  }));

  for (const vote of votes) {
    const adjustedX = Math.min(vote.x, 0.999999);
    const clusterIndex = Math.floor(adjustedX * NUM_TICKS);
    clusters[clusterIndex].votes.push(vote);
  }

    for (const cluster of clusters) {
    cluster.votes.sort((a, b) => {
      // Current user should always appear at the bottom
      if (a.user._id === currentUser?._id) return 1;
      if (b.user._id === currentUser?._id) return -1;

      // Votes with comments should appear closer to the bottom
      if (a.comment && !b.comment) return 1;
      if (!a.comment && b.comment) return -1;

      // Alphabetically by name
      return a.user.displayName.toLowerCase().localeCompare(
        b.user.displayName.toLowerCase(),
      );
    });
  }

  return clusters;
};
