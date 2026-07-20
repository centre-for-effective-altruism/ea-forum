import { fetchUserProfileComments } from "@/lib/comments/commentLists";
import { fetchUserProfileTagRevisions } from "@/lib/tags/tagQueries";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { fetchUserProfile } from "@/lib/users/userQueries";
import { getCurrentUser } from "@/lib/users/currentUser";
import { formatThousands } from "@/lib/formatHelpers";
import UserProfileCommentsList from "./UserProfileCommentsList";
import TagRevisionsList from "./TagRevisionsList";
import UserProfileTabs from "./UserProfileTabs";

export default async function UserProfileComments({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfile(currentUser, slug);
  if (!user?.commentCount && !user?.tagRevisionCount) {
    return null;
  }
  const [comments, tagRevisions] = await Promise.all([
    fetchUserProfileComments({
      currentUser,
      userId: user._id,
    }),
    fetchUserProfileTagRevisions({ userId: user._id }),
  ]);
  if (!comments.length && !tagRevisions.length) {
    return null;
  }
  return (
    <AnalyticsContext pageSectionContext="commentsSection">
      <section
        data-component="UserProfileComments"
        id="comments"
        className="bg-surface-floating rounded p-6"
      >
        <UserProfileTabs
          tabs={[
            {
              name: "comments",
              title: (
                <>
                  Comments{" "}
                  <span className="text-gray-600">
                    {formatThousands(user.commentCount)}
                  </span>
                </>
              ),
              content: comments.length ? (
                <UserProfileCommentsList
                  initialComments={comments}
                  userId={user._id}
                  canLoadMore={user.commentCount > comments.length}
                />
              ) : null,
            },
            {
              name: "topicContributions",
              title: (
                <>
                  Topic contributions{" "}
                  <span className="text-gray-600">
                    {formatThousands(user.tagRevisionCount)}
                  </span>
                </>
              ),
              content: tagRevisions.length ? (
                <TagRevisionsList
                  initialRevisions={tagRevisions}
                  userId={user._id}
                  canLoadMore={tagRevisions.length < user.tagRevisionCount}
                />
              ) : null,
            },
          ]}
        />
      </section>
    </AnalyticsContext>
  );
}
