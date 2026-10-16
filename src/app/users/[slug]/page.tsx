import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { fetchUserProfileCached } from "@/lib/users/userQueries";
import { userGetProfileUrl, userIsBanned } from "@/lib/users/userHelpers";
import { makeCloudinaryImageUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import UserProfileBiography from "@/components/UserProfile/UserProfileBiography";
import UserProfileSequences from "@/components/UserProfile/UserProfileSequences";
import UserProfileComments from "@/components/UserProfile/UserProfileComments";
import UserProfileSummary from "@/components/UserProfile/UserProfileSummary";
import UserProfileDrafts from "@/components/UserProfile/UserProfileDrafts";
import UserProfilePosts from "@/components/UserProfile/UserProfilePosts";
import ReportUserButton from "@/components/UserProfile/ReportUserButton";

type UserProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const [currentUser, { slug }] = await Promise.all([getCurrentUser(), params]);
  const user = await fetchUserProfileCached(currentUser, slug);
  if (!user) {
    return {
      title: "User not found",
    };
  }
  const canonicalUrl = userGetProfileUrl({ user, isAbsolute: true });
  const description = `${user.displayName}'s profile on the EA Forum`;
  const imageUrl = user.profileImageId
    ? makeCloudinaryImageUrl(user.profileImageId, {
        c: "crop",
        g: "custom",
        q: "auto",
        f: "auto",
      })
    : undefined;
  const noIndex =
    (!user.postCount && !user.commentCount) ||
    user.karma < 10 ||
    user.noindex ||
    !user.reviewedByUserId ||
    userIsBanned(user);
  return {
    title: user.displayName,
    description,
    robots: noIndex ? "noindex" : undefined,
    openGraph: {
      type: "profile",
      url: canonicalUrl,
      title: user.displayName,
      description,
      images: imageUrl,
    },
    twitter: {
      description,
      images: imageUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function UserProfile({ params }: UserProfilePageProps) {
  const { slug } = await params;
  if (!slug) {
    notFound();
  }
  return (
    <AnalyticsContext pageContext="userPage">
      <div
        data-component="UserProfile"
        className="w-[766px] max-w-full mx-auto pt-6 pb-30 px-1 flex flex-col gap-6"
      >
        <Suspense fallback={<div className="bg-surface-floating rounded h-80" />}>
          <UserProfileSummary slug={slug} />
        </Suspense>
        <Suspense>
          <UserProfileDrafts slug={slug} />
        </Suspense>
        <Suspense fallback={<div className="bg-surface-floating rounded h-80" />}>
          <UserProfileBiography slug={slug} />
        </Suspense>
        <Suspense fallback={<div className="bg-surface-floating rounded h-160" />}>
          <UserProfilePosts slug={slug} />
        </Suspense>
        <Suspense fallback={<div className="bg-surface-floating rounded h-80" />}>
          <UserProfileSequences slug={slug} />
        </Suspense>
        <Suspense fallback={<div className="bg-surface-floating rounded h-160" />}>
          <UserProfileComments slug={slug} />
        </Suspense>
        <div className="flex justify-end mt-8">
          <ReportUserButton slug={slug} />
        </div>
      </div>
    </AnalyticsContext>
  );
}
