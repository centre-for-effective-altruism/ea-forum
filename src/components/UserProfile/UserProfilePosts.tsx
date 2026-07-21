import { fetchUserProfileCached } from "@/lib/users/userQueries";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import UserProfileHeading from "./UserProfileHeading";

export default async function UserProfilePosts({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfileCached(currentUser, slug);
  if (!user?.postCount) {
    return null;
  }
  // TODO: Different sortings when we implement the all posts page
  return (
    <AnalyticsContext listContext="userPagePosts">
      <section
        data-component="UserProfilePosts"
        id="posts"
        className="bg-surface-floating rounded p-6"
      >
        <UserProfileHeading count={user.postCount} className="mb-4">
          Posts
        </UserProfileHeading>
        <ViewBasedPostsList
          view={{
            view: "userProfile",
            userId: user._id,
            limit: 10,
          }}
        />
      </section>
    </AnalyticsContext>
  );
}
