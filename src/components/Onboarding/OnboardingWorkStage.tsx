import { useCallback, useState } from "react";
import { useOnboarding } from "./useOnboarding";
import { CareerStageValue, userCareerStages } from "@/lib/users/userHelpers";
import { rpc } from "@/lib/rpc";
import OnboardingSelect from "./OnboardingSelect";
import OnboardingStage from "./OnboardingStage";
import OnboardingInput from "./OnboardingInput";
import SectionTitle from "../SectionTitle";
import Type from "../Type";

export default function OnboardingWorkStage() {
  const { goToNextStage, goToNextStageAfter, viewAsAdmin } = useOnboarding();
  const [role, setRole] = useState("");
  const [organization, setOrganization] = useState("");
  const [careerStage, setCareerStage] = useState<CareerStageValue | null>(null);

  const onContinue = useCallback(async () => {
    // If this is an admin testing, don't make any changes
    if (viewAsAdmin) {
      await goToNextStage();
      return;
    }

    await goToNextStageAfter(
      rpc.users.updateWork({
        jobTitle: role,
        organization,
        careerStage: careerStage ? [careerStage] : null,
      }),
    );
  }, [
    role,
    organization,
    careerStage,
    goToNextStage,
    goToNextStageAfter,
    viewAsAdmin,
  ]);

  const canContinue = !!(role || organization || careerStage);
  return (
    <OnboardingStage
      stageName="work"
      title="What do you do?"
      canContinue={canContinue}
      onContinue={onContinue}
      skippable
      className="mb-[10px]"
    >
      <Type>
        If this is relevant to you, share your role to make it easier for others to
        help you and ask for your help.
      </Type>
      <div>
        <SectionTitle title="Role" titleClassName="text-[12px]! mb-2" />
        <OnboardingInput
          value={role}
          setValue={setRole}
          placeholder="e.g. Software engineer"
        />
      </div>
      <div>
        <SectionTitle title="Organization" titleClassName="text-[12px]! mb-2" />
        <OnboardingInput
          value={organization}
          setValue={setOrganization}
          placeholder="e.g. Centre for Effective Altruism"
        />
      </div>
      <div>
        <SectionTitle title="Career stage" titleClassName="text-[12px]! mb-2" />
        <OnboardingSelect
          value={careerStage}
          setValue={setCareerStage}
          options={userCareerStages}
        />
      </div>
    </OnboardingStage>
  );
}
