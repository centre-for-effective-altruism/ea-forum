import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchUserProfile } from "@/lib/users/userQueries";
import UserProfileBiographyTabs from "./UserProfileBiographyTabs";

export default async function UserProfileBiography({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfile(currentUser, slug);
  if (!user) {
    return null;
  }

  const { biographyHtml, programParticipation } = user;
  if (!biographyHtml && !programParticipation?.length) {
    return null;
  }

  return (
    <section
      data-component="UserProfileBiography"
      id="bio"
      className="bg-surface-floating rounded p-6 flex flex-col gap-2"
    >
      <UserProfileBiographyTabs
        biographyHtml={biographyHtml}
        programParticipation={programParticipation}
      />
    </section>
  );
}
