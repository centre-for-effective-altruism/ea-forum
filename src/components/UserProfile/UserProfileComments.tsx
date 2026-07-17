import { fetchUserProfileComments } from "@/lib/comments/commentLists";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { fetchUserProfile } from "@/lib/users/userQueries";
import { getCurrentUser } from "@/lib/users/currentUser";
import UserProfileCommentsList from "./UserProfileCommentsList";
import UserProfileHeading from "./UserProfileHeading";

export default async function UserProfileComments({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfile(currentUser, slug);
  if (!user?.commentCount) {
    return null;
  }
  const comments = await fetchUserProfileComments({
    currentUser,
    userId: user._id,
  });
  if (!comments.length) {
    return null;
  }
  // TODO: Show topic contributions - should have page section context userPageWiki
  return (
    <AnalyticsContext pageSectionContext="commentsSection">
      <section
        data-component="UserProfileComments"
        id="comments"
        className="bg-surface-floating rounded p-6"
      >
        <UserProfileHeading className="mb-4">
          Comments <span className="text-gray-600">{user.commentCount}</span>
        </UserProfileHeading>
        <UserProfileCommentsList
          initialComments={comments}
          userId={user._id}
          canLoadMore={user.commentCount > comments.length}
        />
      </section>
    </AnalyticsContext>
  );
}
