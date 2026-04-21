import {
  FC,
  Fragment,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { Json } from "@/lib/typeHelpers";
import type { CurrentUser } from "@/lib/users/currentUser";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTracking } from "@/lib/analyticsEvents";

export type OnboardingStage = string;

type OnboardingContext = {
  currentStage?: OnboardingStage;
  goToNextStage: () => Promise<void>;
  goToNextStageAfter: <T>(promise: Promise<T>) => Promise<void>;
  nextStageIsLoading: boolean;
  currentUser: CurrentUser;
  captureOnboardingEvent: (
    type?: string,
    trackingData?: Record<string, Json>,
  ) => void;
  // if viewAsAdmin is true, this is an admin testing out the flow, so don't
  // update their account
  viewAsAdmin?: boolean;
};

const onboardingContext = createContext<OnboardingContext>({
  goToNextStage: async () => {},
  goToNextStageAfter: async () => {},
  nextStageIsLoading: false,
  currentUser: {} as CurrentUser,
  captureOnboardingEvent: () => {},
  viewAsAdmin: false,
});

export const OnboardingProvider: FC<{
  stages: Record<string, ReactNode>;
  onOnboardingComplete?: () => void;
  viewAsAdmin?: boolean;
}> = ({ stages, onOnboardingComplete, viewAsAdmin }) => {
  const stageNames = Object.keys(stages);
  const [stage, setStage] = useState<OnboardingStage>(stageNames[0]);
  const [loading, setLoading] = useState(false);
  const { currentUser, refetchCurrentUser } = useCurrentUser();
  const { captureEvent } = useTracking();

  const goToNextStage = useCallback(async () => {
    const getNextStage = (
      currentStage: OnboardingStage,
    ): OnboardingStage | undefined =>
      stageNames[stageNames.indexOf(currentStage) + 1];

    setLoading(true);
    await refetchCurrentUser();
    setLoading(false);
    const nextStage = getNextStage(stage);
    if (nextStage) {
      setStage(nextStage);
    } else {
      onOnboardingComplete?.();
    }
  }, [stage, onOnboardingComplete, refetchCurrentUser, stageNames]);

  const goToNextStageAfter = useCallback(
    async function <T>(promise: Promise<T>) {
      setLoading(true);
      try {
        await promise;
      } catch (e) {
        console.error("Error in 'next stage' promise:", e);
        setLoading(false);
        return;
      }
      await goToNextStage();
    },
    [goToNextStage],
  );

  // Wrap `captureEvent` to suppress events when we are viewing as admin
  const captureOnboardingEvent = useCallback(
    (type?: string, trackingData?: Record<string, Json>) => {
      if (!viewAsAdmin) {
        captureEvent(type, trackingData);
      }
    },
    [viewAsAdmin, captureEvent],
  );

  // This should never happen
  if (!currentUser) {
    return null;
  }

  return (
    <onboardingContext.Provider
      value={{
        currentStage: stage,
        goToNextStage,
        goToNextStageAfter,
        nextStageIsLoading: loading,
        currentUser,
        captureOnboardingEvent,
        viewAsAdmin,
      }}
    >
      {...Object.entries(stages).map(([name, stage]) => (
        <Fragment key={name}>{stage}</Fragment>
      ))}
    </onboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(onboardingContext);
