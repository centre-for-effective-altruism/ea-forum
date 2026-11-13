import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import UserSettingsContent from "@/components/UserSettings/UserSettingsContent";
import UserSettingsSkeleton from "@/components/UserSettings/UserSettingsSkeleton";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "Account settings",
  robots: "noindex",
};

export default function UserSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  return (
    <AnalyticsContext pageContext="userSettingsPage">
      <div className="w-[640px] max-w-full mx-auto pt-8 pb-24 px-4 flex flex-col gap-6">
        <Type style="postsPageTitle">Account settings</Type>
        <Suspense fallback={<UserSettingsSkeleton />}>
          <UserSettingsContent params={params} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
