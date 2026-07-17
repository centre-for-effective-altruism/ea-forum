import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import {
  profileFieldToSocialMediaHref,
  socialMediaIconNameByUserFieldName,
  SocialMediaProfileField,
  socialMediaProfileFields,
  userCanEditUser,
  userCareerStageIcons,
  userCareerStages,
  userGetEditUrl,
  userGetProfileUrl,
  userIsAdminOrMod,
} from "@/lib/users/userHelpers";
import { formatLongDate } from "@/lib/timeUtils";
import { getCurrentUser } from "@/lib/users/currentUser";
import { formatThousands } from "@/lib/formatHelpers";
import { fetchUserProfile } from "@/lib/users/userQueries";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import CalendarIcon from "@heroicons/react/24/solid/CalendarIcon";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import DisplayNameWithMarkers from "./DisplayNameWithMarkers";
import NewConversationButton from "../NewConversationButton";
import UserSubscribeButton from "./UserSubscribeButton";
import UserProfileImage from "../UserProfileImage";
import SocialMediaIcon from "../SocialMediaIcon";
import StructuredData from "../StructuredData";
import PinIcon from "../Icons/PinIcon";
import CopyUserId from "./CopyUserId";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";
import UserProfileTags from "./UserProfileTags";

export default async function UserProfileSummary({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfile(currentUser, slug);
  if (!user) {
    notFound();
  }
  if (slug !== user.slug && user.oldSlugs?.includes(slug) && !user.deleted) {
    permanentRedirect(userGetProfileUrl({ user }));
  }

  const socialMediaFields = (
    Object.keys(socialMediaProfileFields) as SocialMediaProfileField[]
  ).filter((field) => !!user[field]);

  const {
    _id,
    displayName,
    jobTitle,
    organization,
    biographyHtml,
    howICanHelpOthersHtml,
    howOthersCanHelpMeHtml,
    createdAt,
    profileTagIds,
  } = user;

  const biography = biographyHtml ? htmlToTextDefault(biographyHtml) : null;
  const howICanHelpOthers = howICanHelpOthersHtml
    ? htmlToTextDefault(howICanHelpOthersHtml)
    : null;
  const howOthersCanHelpMe = howOthersCanHelpMeHtml
    ? htmlToTextDefault(howOthersCanHelpMeHtml)
    : null;

  const isCurrentUser = _id === currentUser?._id;
  const isAdmin = userIsAdminOrMod(currentUser);
  const canEdit = userCanEditUser(currentUser, user);

  return (
    <section
      data-component="UserProfileSummary"
      id="summary"
      className="bg-surface-floating rounded p-6 relative"
    >
      <StructuredData
        data={{
          "@context": "http://schema.org",
          "@type": "Person",
          name: user.displayName,
          url: userGetProfileUrl({ user, isAbsolute: true }),
          description: biography,
          jobTitle,
          ...(user.organization && {
            worksFor: {
              "@type": "Organization",
              name: user.organization,
            },
          }),
          interactionStatistic: [
            {
              "@type": "InteractionCounter",
              interactionType: {
                "@type": "http://schema.org/LikeAction",
              },
              userInteractionCount: user.karma,
            },
            {
              "@type": "InteractionCounter",
              interactionType: {
                "@type": "http://schema.org/WriteAction",
              },
              userInteractionCount: user.postCount,
            },
          ],
          offers: howICanHelpOthers,
          seeks: howOthersCanHelpMe,
          memberSince: new Date(createdAt).toISOString(),
        }}
      />
      {canEdit && (
        <Button
          variant="greyFilled"
          href={`/profile/${user.slug}/edit`}
          className="absolute top-6 right-6"
        >
          Edit public profile
        </Button>
      )}
      <UserProfileImage user={user} size={96} />
      <Type style="onboardingTitle" className="mt-1 mb-0.5">
        <DisplayNameWithMarkers displayName={displayName} />
      </Type>
      {(jobTitle || organization) && (
        <Type style="bodyLarge">
          {jobTitle} {organization ? `@ ${organization}` : ""}
        </Type>
      )}
      <div
        className="
          flex items-center flex-wrap gap-x-5 gap-y-2.5 text-gray-600
          mt-5 mb-4
        "
      >
        <Type className="flex items-center gap-1">
          <StarIcon className="w-5 min-w-5" />
          {formatThousands(user.karma)} karma
        </Type>
        <Type className="flex items-center gap-1">
          <CalendarIcon className="w-5 min-w-5" />
          Joined {formatLongDate(user.createdAt)}
        </Type>
        {user.careerStage?.map((stage) => {
          const data = userCareerStages.find(({ value }) => value === stage);
          const Icon = data?.icon && userCareerStageIcons[data.icon];
          return data && Icon ? (
            <Type key={stage} className="flex items-center gap-1">
              <Icon className="w-5 min-w-5" />
              {data.label}
            </Type>
          ) : null;
        })}
        {user.mapLocation && (
          <Link href="/groups#individuals" className="hover:text-gray-1000">
            <Type className="flex items-center gap-1">
              <PinIcon className="w-6 min-w-6" />
              {user.mapLocation.formatted_address}
            </Type>
          </Link>
        )}
        {socialMediaFields.length > 0 && (
          <div className="flex items-center gap-1.5">
            {socialMediaFields.map((field) => (
              <Link
                key={field}
                href={profileFieldToSocialMediaHref(field, user[field]!)}
                className="hover:text-gray-1000"
                openInNewTab
              >
                <SocialMediaIcon
                  name={socialMediaIconNameByUserFieldName[field]}
                  className="w-5 min-w-5"
                />
              </Link>
            ))}
          </div>
        )}
        {user.website && (
          <Link
            href={`https://${user.website}`}
            className="hover:text-gray-1000"
            openInNewTab
          >
            <Type className="flex items-center gap-1">
              <SocialMediaIcon name="website" className="w-5 min-w-5" />
              {user.website}
            </Type>
          </Link>
        )}
      </div>
      {!isCurrentUser && (
        <div className="flex items-center gap-2">
          <NewConversationButton userId={_id}>
            <Button>Message</Button>
          </NewConversationButton>
          <UserSubscribeButton userId={_id} />
        </div>
      )}
      {profileTagIds.length > 0 && (
        <Suspense fallback={<div className="bg-gray-300 w-full h-7 rounded mt-4" />}>
          <UserProfileTags tagIds={profileTagIds} className="mt-4" />
        </Suspense>
      )}
      {(isAdmin || isCurrentUser || canEdit) && (
        <div className="flex items-center gap-4 mt-3.5">
          {isAdmin && <CopyUserId _id={_id} />}
          {isCurrentUser && (
            <Type style="bodyHeavy" className="text-primary-dark">
              <Link href="/manageSubscriptions" className="hover:text-primary">
                Manage subscriptions
              </Link>
            </Type>
          )}
          {isCurrentUser && (
            <Type style="bodyHeavy" className="text-primary-dark">
              <Link href="/keywords" className="hover:text-primary">
                Manage keyword alerts
              </Link>
            </Type>
          )}
          {canEdit && (
            <Type style="bodyHeavy" className="text-primary-dark">
              <Link href={userGetEditUrl({ user })} className="hover:text-primary">
                Account settings
              </Link>
            </Type>
          )}
        </div>
      )}
    </section>
  );
}
