import stringify from "json-stringify-deterministic";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchDraftsListUserSettings } from "@/lib/users/userQueries";
import { fetchDraftsListPosts } from "@/lib/posts/postLists";
import {
  draftsListLimit,
  resolveDraftsListSettings,
} from "@/lib/posts/draftsListSettings";
import DraftsList from "./DraftsList";
import Type from "../Type";

export default async function DraftsPageContent({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [currentUser, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!currentUser) {
    return <Type className="text-gray-600">Please log in to view your drafts.</Type>;
  }
  const userSettings = await fetchDraftsListUserSettings(currentUser._id);
  const settings = resolveDraftsListSettings(query, userSettings);
  const posts = await fetchDraftsListPosts({
    currentUserId: currentUser._id,
    settings,
    limit: draftsListLimit,
  });
  return (
    <DraftsList key={stringify(settings)} initialPosts={posts} settings={settings} />
  );
}
