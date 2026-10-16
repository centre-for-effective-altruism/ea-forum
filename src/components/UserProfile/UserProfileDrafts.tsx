import { fetchUserProfileDraftSequences } from "@/lib/sequences/sequenceQueries";
import { fetchUserProfileDraftComments } from "@/lib/comments/commentLists";
import { fetchUserProfileDraftPosts } from "@/lib/posts/postLists";
import { userIsAdminOrMod } from "@/lib/users/userHelpers";
import { fetchUserProfileCached } from "@/lib/users/userQueries";
import { getCurrentUser } from "@/lib/users/currentUser";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import UserProfileDraftsList from "./UserProfileDraftsList";

export default async function UserPageDrafts({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfileCached(currentUser, slug);
  if (
    !currentUser ||
    !user ||
    (user._id !== currentUser._id && !userIsAdminOrMod(currentUser))
  ) {
    return null;
  }
  // For now, we just fetch all without pagination - I don't think any users have
  // enough that this will be a problem. Maybe we need to change this in the future.
  const [posts, sequences, comments] = await Promise.all([
    fetchUserProfileDraftPosts({
      currentUserId: currentUser._id,
      userId: user._id,
    }),
    fetchUserProfileDraftSequences({ userId: user._id }),
    fetchUserProfileDraftComments({ currentUser, userId: user._id }),
  ]);
  return (
    <AnalyticsContext listContext="userPageDrafts">
      <UserProfileDraftsList
        isCurrentUser={user._id === currentUser._id}
        posts={posts}
        sequences={sequences}
        comments={comments}
      />
    </AnalyticsContext>
  );
}
