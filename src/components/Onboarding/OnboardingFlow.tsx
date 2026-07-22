"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCallback, useEffect, useState } from "react";
import { OnboardingProvider } from "./useOnboarding";
import { useTracking } from "@/lib/analyticsEvents";
import Popover from "../Popover";
import OnboardingUserStage from "./OnboardingUserStage";
import OnboardingSubscribeStage from "./OnboardingSubscribeStage";
import OnboardingWorkStage from "./OnboardingWorkStage";
import OnboardingThankYouStage from "./OnboardingThankYouStage";

export default function OnboardingFlow({
  viewAsAdmin,
}: Readonly<{
  viewAsAdmin?: boolean;
}>) {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();

  // If `usernameUnset` is true, then we need to show the onboarding flow.
  // We cache the value in a `useState` as it gets set to false in the very
  // first stage (which is the only compulsary stage) - without caching the
  // value this would close the popup.
  const [isOnboarding, setIsOnboarding] = useState(
    currentUser?.usernameUnset || viewAsAdmin,
  );

  useEffect(() => {
    // Set `isOnboarding` to true after a new user signs up.
    setIsOnboarding((currentValue) => currentValue || !!currentUser?.usernameUnset);
  }, [currentUser?.usernameUnset]);

  const onOnboardingComplete = useCallback(() => {
    setIsOnboarding(false);
    captureEvent("onboardingComplete");
  }, [captureEvent]);

  if (!isOnboarding) {
    return null;
  }

  return (
    <Popover
      open
      noCloseOnOutsideClick
      background="blurred"
      onClose={onOnboardingComplete}
      className="p-0!"
    >
      <OnboardingProvider
        stages={{
          user: <OnboardingUserStage />,
          subscribe: <OnboardingSubscribeStage />,
          work: <OnboardingWorkStage />,
          thankYou: <OnboardingThankYouStage />,
        }}
        onOnboardingComplete={onOnboardingComplete}
        viewAsAdmin={viewAsAdmin}
      />
    </Popover>
  );
}
