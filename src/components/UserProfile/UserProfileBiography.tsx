import { userProgramParticipation } from "@/lib/users/userHelpers";
import { fetchUserProfileCached } from "@/lib/users/userQueries";
import { getCurrentUser } from "@/lib/users/currentUser";
import { filterNonNull } from "@/lib/typeHelpers";
import UserProfileTabs from "./UserProfileTabs";
import PostBody from "../ContentStyles/PostBody";
import Type from "../Type";

export default async function UserProfileBiography({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfileCached(currentUser, slug);
  if (!user) {
    return null;
  }

  const { biographyHtml, programParticipation } = user;
  const participation = filterNonNull(
    programParticipation?.map(
      (p) => userProgramParticipation.find(({ value }) => p === value)?.label,
    ) ?? [],
  );

  if (!biographyHtml && !participation?.length) {
    return null;
  }

  return (
    <section
      data-component="UserProfileBiography"
      id="bio"
      className="bg-surface-floating rounded p-6 flex flex-col gap-2"
    >
      <UserProfileTabs
        tabs={[
          {
            name: "Bio",
            content: biographyHtml ? <PostBody html={biographyHtml} /> : null,
          },
          {
            name: "Participation",
            count: participation.length,
            content: participation.length ? (
              <ul className="list-disc ml-5">
                {participation.map((participation) => (
                  <Type key={participation} style="bodySerif" As="li">
                    {participation}
                  </Type>
                ))}
              </ul>
            ) : null,
          },
        ]}
      />
    </section>
  );
}
