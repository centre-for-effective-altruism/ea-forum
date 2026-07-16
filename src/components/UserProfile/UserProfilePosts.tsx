import { fetchUserProfile } from "@/lib/users/userQueries";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import Type from "../Type";

export default async function UserProfilePosts({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfile(currentUser, slug);
  if (!user?.postCount) {
    return null;
  }
  // TODO: Different sortings
  return (
    <AnalyticsContext listContext="userPagePosts">
      <section
        data-component="UserProfilePosts"
        id="posts"
        className="bg-surface-floating rounded p-6"
      >
        <Type style="sectionTitleLarge" className="mb-4">
          Posts <span className="text-gray-600">{user.postCount}</span>
        </Type>
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
