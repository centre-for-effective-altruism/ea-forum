"use client";

import { useMemo } from "react";
import type {
  KarmaChangeUpdateFrequency,
  UserKarmaChanges,
} from "@/lib/users/karmaChangesTypes";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import Type from "../Type";
import Link from "../Link";
import clsx from "clsx";

const settingsNudgeMap: Record<KarmaChangeUpdateFrequency, string> = {
  realtime: "appear in real time",
  daily: "are batched daily",
  weekly: "are batched weekly",
  disabled: "are disabled",
};

export default function KarmaAndReactsNotifications({
  karmaChanges,
  className,
}: Readonly<{
  karmaChanges: UserKarmaChanges | null;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();

  const hasNewKarmaChanges = useMemo(
    () =>
      !!karmaChanges &&
      (karmaChanges.posts?.length ||
        karmaChanges.comments?.length ||
        karmaChanges.tagRevisions?.length),
    [karmaChanges],
  );

  const todaysKarmaChanges = karmaChanges?.todaysKarmaChanges;
  const hasKarmaChangesToday = useMemo(
    () =>
      !!todaysKarmaChanges &&
      (todaysKarmaChanges.posts?.length ||
        todaysKarmaChanges.comments?.length ||
        todaysKarmaChanges.tagRevisions?.length),
    [todaysKarmaChanges],
  );

  const thisWeeksKarmaChanges = karmaChanges?.thisWeeksKarmaChanges;
  const hasKarmaChangesThisWeek = useMemo(
    () =>
      !!thisWeeksKarmaChanges &&
      (thisWeeksKarmaChanges.posts?.length ||
        thisWeeksKarmaChanges.comments?.length ||
        thisWeeksKarmaChanges.tagRevisions?.length),
    [thisWeeksKarmaChanges],
  );

  if (!currentUser) {
    return null;
  }

  const {
    karmaChangeNotifierSettings: { updateFrequency },
  } = currentUser;

  return (
    <section
      data-component="KarmaAndReactsNotifications"
      className={clsx("flex flex-col gap-3", className)}
    >
      <Type style="sectionTitleSmall">Karma & reacts</Type>
      {!hasNewKarmaChanges && !hasKarmaChangesToday && !hasKarmaChangesThisWeek && (
        <Type style="bodySmall" className="italic text-gray-600">
          No new karma or reacts
        </Type>
      )}
      <Type style="bodySmall" className="text-gray-600">
        Notifications {settingsNudgeMap[updateFrequency]}.{" "}
        <Link
          href="/account?highlightField=auto_subscribe_to_my_posts"
          className="font-[600] text-primary-dark hover:opacity-70"
        >
          Change settings
        </Link>
      </Type>
    </section>
  );
}
