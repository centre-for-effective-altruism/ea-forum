import { CurrentUser, getCurrentUser } from "@/lib/users/currentUser";
import { fetchBookmarkedPosts, fetchReadHistoryPosts } from "@/lib/posts/postLists";
import { fetchBookmarkedComments } from "@/lib/comments/commentLists";
import { fetchContinueReading } from "@/lib/sequences/continueReading";
import { fetchVoteHistory } from "@/lib/votes/voteHistory";
import {
  getSavedPageTab,
  InitialSavedPageTabData,
  SavedPageTabName,
  savedPageListLimit as limit,
} from "./savedPageHelpers";
import SavedPageTabs from "./SavedPageTabs";
import Type from "../Type";

const fetchInitialTabData = async (
  tab: SavedPageTabName,
  currentUser: CurrentUser,
): Promise<InitialSavedPageTabData> => {
  const currentUserId = currentUser._id;
  switch (tab) {
    case "readhistory":
      return { tab, data: await fetchReadHistoryPosts({ currentUserId, limit }) };
    case "votehistory":
      return { tab, data: await fetchVoteHistory({ currentUser, limit }) };
    case "saved":
    default:
      const [continueReading, posts, comments] = await Promise.all([
        fetchContinueReading(currentUser),
        fetchBookmarkedPosts({ currentUserId, limit }),
        fetchBookmarkedComments({ currentUser, limit }),
      ]);
      return { tab: "saved", data: { continueReading, posts, comments } };
  }
};

export default async function SavedPageContent({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [currentUser, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!currentUser) {
    return (
      <Type className="text-gray-600">
        Please log in to view your saved posts and reading history.
      </Type>
    );
  }
  const initialData = await fetchInitialTabData(
    getSavedPageTab(query.tab),
    currentUser,
  );
  return <SavedPageTabs initialData={initialData} />;
}
