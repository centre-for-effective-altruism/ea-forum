import { useCallback, useEffect, useState } from "react";
import { useOnboarding } from "./useOnboarding";
import { rpc } from "@/lib/rpc";
import ArrowRightIcon from "@heroicons/react/24/solid/ArrowRightIcon";
import OnboardingThankYouSection from "./OnboardingThankYouSection";
import OnboardingStage from "./OnboardingStage";
import SectionTitle from "../SectionTitle";
import Button from "../Button";
import Type from "../Type";

export default function OnboardingThankYouStage() {
  const {
    currentStage,
    goToNextStage,
    currentUser,
    captureOnboardingEvent,
    viewAsAdmin,
  } = useOnboarding();
  const [subscribedToDigest, setSubscribedToDigest] = useState(true);
  const [subscribedToNewsletter, setSubscribedToNewsletter] = useState(false);
  const [sendMarketingEmails, setSendMarketingEmails] = useState(true);

  useEffect(() => {
    // Default to subscribing to the digest
    if (
      !currentUser.subscribedToDigest &&
      currentStage === "thankyou" &&
      !viewAsAdmin
    ) {
      void rpc.users.subscribeToList({ list: "digest" });
    }
  }, [currentUser, viewAsAdmin, currentStage]);

  const toggleSubscribedToDigest = useCallback(
    (value: boolean) => {
      setSubscribedToDigest(value);
      if (!viewAsAdmin) {
        void rpc.users.subscribeToList({ list: "digest", subscribed: value });
        captureOnboardingEvent("toggleDigest", { subscribed: value });
      }
    },
    [captureOnboardingEvent, viewAsAdmin],
  );

  const toggleSubscribedToNewsletter = useCallback(
    (value: boolean) => {
      setSubscribedToNewsletter(value);
      if (!viewAsAdmin) {
        void rpc.users.subscribeToList({ list: "newsletter", subscribed: value });
        captureOnboardingEvent("toggleNewsletter", { subscribed: value });
      }
    },
    [captureOnboardingEvent, viewAsAdmin],
  );

  const toggleSendMarketingEmails = useCallback(
    (value: boolean) => {
      setSendMarketingEmails(value);
      if (!viewAsAdmin) {
        void rpc.users.updateSendMarketingEmails({ value });
        captureOnboardingEvent("toggleMarketingEmails", { subscribed: value });
      }
    },
    [captureOnboardingEvent, viewAsAdmin],
  );

  const onComplete = useCallback(() => {
    void goToNextStage();
    captureOnboardingEvent("onboardingComplete");
  }, [goToNextStage, captureOnboardingEvent]);

  return (
    <OnboardingStage
      stageName="thankYou"
      title="Thanks for joining the discussion"
      className="p-10 flex flex-col"
      hideHeader
      footer={
        <div className="px-4 text-center">
          <Button
            onClick={onComplete}
            className="
              flex items-center gap-2 justify-center w-full py-3! text-always-white!
            "
          >
            Go to the Forum <ArrowRightIcon className="w-4" />
          </Button>
        </div>
      }
      hideFooterButton
    >
      <div className="max-xs:grow">
        <Type style="onboardingTitle" className="my-8 text-[40px] leading-[initial]">
          Thanks for joining the discussion!
        </Type>
        <SectionTitle title="Email updates" titleClassName="text-[12px]! mb-2" />
        <OnboardingThankYouSection
          title="Weekly top Forum posts"
          description="The Forum Digest is curated by the Forum team"
          value={subscribedToDigest}
          setValue={toggleSubscribedToDigest}
        />
        <OnboardingThankYouSection
          title="Monthly EA Newsletter"
          description="Jobs, opportunities, the month's best articles, and more"
          value={subscribedToNewsletter}
          setValue={toggleSubscribedToNewsletter}
        />
        <OnboardingThankYouSection
          title="Updates from the EA Forum"
          description="Competitions, debates, and themed weeks"
          value={sendMarketingEmails}
          setValue={toggleSendMarketingEmails}
        />
        <div className="bg-gray-100 rounded p-3 mt-8">
          <div>
            <Type className="text-gray-1000 font-[600]!">
              Join our feedback group
            </Type>
            <Type className="text-gray-600 font-[500]!">
              We may reach out later to get your takes on EA and the Forum.
            </Type>
          </div>
          <Button
            variant="greyFilled"
            href="https://tally.so/r/mDMR55"
            className="mt-3"
          >
            Sign up here
          </Button>
        </div>
      </div>
    </OnboardingStage>
  );
}
