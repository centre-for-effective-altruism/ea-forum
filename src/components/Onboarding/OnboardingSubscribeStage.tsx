import { useCallback, useState } from "react";
import { useOnboarding } from "./useOnboarding";
import { useSuggestedSubscriptions } from "./useSuggestedSubscriptions";
import { FilterSettingsProvider } from "@/lib/hooks/useFilterSettings";
import OnboardingStage from "./OnboardingStage";
import OnboardingUser from "./OnboardingUser";
import OnboardingTag from "./OnboardingTag";
import Loading from "../Loading";
import Type from "../Type";

const editSet = (currentSet: string[], value: string, add: boolean) => {
  const values = new Set(currentSet);
  if (add) {
    values.add(value);
  } else {
    values.delete(value);
  }
  return Array.from(values);
};

export default function OnboardingSubscribeStage() {
  const { currentUser } = useOnboarding();
  const [subscribedTags, setSubscribedTags] = useState<string[]>([]);
  const [subscribedUsers, setSubscribedUsers] = useState<string[]>([]);

  const onSubscribedTag = useCallback((id: string, subscribed: boolean) => {
    setSubscribedTags((current) => editSet(current, id, subscribed));
  }, []);

  const onSubscribedUser = useCallback((id: string, subscribed: boolean) => {
    setSubscribedUsers((current) => editSet(current, id, subscribed));
  }, []);

  const { tags, users } = useSuggestedSubscriptions();

  const canContinue = !!(subscribedTags.length || subscribedUsers.length);
  return (
    <OnboardingStage
      stageName="subscribe"
      title={`Welcome to the EA Forum, ${currentUser.displayName}!`}
      canContinue={canContinue}
      skippable
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3">
        <Type>Subscribe to a topic to see more of it on the Forum Frontpage.</Type>
        <div className="flex justify-center flex-wrap gap-2 text-left">
          {tags.length < 1 && <Loading />}
          <FilterSettingsProvider>
            {tags.map((tag) => (
              <OnboardingTag
                key={tag._id}
                tag={tag}
                onSubscribed={onSubscribedTag}
              />
            ))}
          </FilterSettingsProvider>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Type>
          Subscribe to an author to get notified when they post. They won&apos;t see
          this.
        </Type>
        <div className="flex justify-center flex-wrap gap-2 text-left">
          {users.length < 1 && <Loading />}
          {users.map((user) => (
            <OnboardingUser
              key={user._id}
              user={user}
              onSubscribed={onSubscribedUser}
            />
          ))}
        </div>
      </div>
    </OnboardingStage>
  );
}
