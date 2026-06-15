import { useCallback } from "react";
import type { OnboardingUser } from "@/lib/users/userQueries";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { useOnboarding } from "./useOnboarding";
import { formatRole, formatStat } from "@/lib/formatHelpers";
import UserProfileImage from "../UserProfileImage";
import Type from "../Type";
import clsx from "clsx";

export default function OnboardingUser({
  user,
  onSubscribed,
}: Readonly<{
  user: OnboardingUser;
  onSubscribed: (id: string, subscribed: boolean) => void;
}>) {
  const { viewAsAdmin } = useOnboarding();

  const { data, update } = useSubscription({
    collectionName: "Users",
    documentId: user._id,
    type: "newPosts",
  });
  const subscribed = !!data?.subscribed;

  const { _id, displayName, karma, jobTitle, organization } = user;

  const toggleSubscribed = useCallback(() => {
    if (!viewAsAdmin) {
      const newSubscribed = !subscribed;
      update(newSubscribed);
      onSubscribed(_id, newSubscribed);
    }
  }, [viewAsAdmin, subscribed, _id, update, onSubscribed]);

  return (
    <article
      data-component="OnboardingUser"
      onClick={toggleSubscribed}
      className={clsx(
        "cursor-pointer select-none border-1 rounded p-3 hover:bg-gray-200",
        "flex flex-col grow basis-[34%] max-xs:basis-[51%]",
        subscribed ? "border-primary-dark" : "border-gray-300",
      )}
    >
      <div className="flex gap-[14px]">
        <UserProfileImage user={user} size={40} />
        <div>
          <Type style="bodyHeavy" className="text-gray-1000">
            {displayName}
          </Type>
          <Type style="bodySmall" className="text-gray-600">
            {formatStat(karma)} karma
          </Type>
        </div>
      </div>
      <Type>{formatRole(jobTitle, organization)}</Type>
    </article>
  );
}
