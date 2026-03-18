import { FC, ReactNode, useCallback, useState } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useOnboarding } from "./useOnboarding";
import clsx from "clsx";
import LightbulbIcon from "../Icons/LightbulbIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import ArrowRightIcon from "@heroicons/react/24/solid/ArrowRightIcon";
import LogoutConfirmationDialog from "./LogoutConfirmationDialog";
import Tooltip from "../Tooltip";
import Button from "../Button";
import Type from "../Type";

export default function OnboardingStage({
  stageName,
  title,
  skippable,
  canContinue,
  onContinue,
  footer,
  hideHeader,
  hideFooter,
  hideFooterButton,
  thin,
  children,
  className,
  Icon = LightbulbIcon,
}: Readonly<{
  stageName: string;
  title: string;
  skippable?: boolean;
  canContinue?: boolean;
  onContinue?: () => void | Promise<void>;
  footer?: ReactNode;
  hideHeader?: boolean;
  hideFooter?: boolean;
  hideFooterButton?: boolean;
  thin?: boolean;
  children?: ReactNode;
  className?: string;
  Icon?: FC<{ className?: string }>;
}>) {
  const { currentStage, goToNextStage, nextStageIsLoading, captureOnboardingEvent } =
    useOnboarding();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const openLogoutConfirmation = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  // Closes the dialog without logging out
  const handleDialogCancel = useCallback(() => {
    setLogoutDialogOpen(false);
  }, []);

  const wrappedOnContinue = useCallback(async () => {
    await onContinue?.();
    captureOnboardingEvent("onboardingContinue", { from: stageName });
    await goToNextStage();
  }, [onContinue, goToNextStage, captureOnboardingEvent, stageName]);

  const onSkip = useCallback(async () => {
    captureOnboardingEvent("onboardingSkip", { from: stageName });
    await goToNextStage();
  }, [goToNextStage, captureOnboardingEvent, stageName]);

  if (currentStage !== stageName) {
    return null;
  }

  return (
    <AnalyticsContext
      pageElementContext="onboardingFlow"
      pageElementSubContext={stageName}
    >
      <div
        data-component="OnboardingStage"
        className={clsx(
          "relative max-w-full max-h-[min(80vh,720px)] h-full flex flex-col",
          "[&_a]:underline [&_a]:hover:no-underline [&_a]:hover:opacity-100",
          "max-xs:max-h-screen max-sm:pb-5 max-xs:w-full",
          thin ? "w-[540px]" : "w-[612px]",
        )}
      >
        <div className="absolute top-4 right-6">
          <Tooltip title="Logout">
            <button onClick={openLogoutConfirmation} className="cursor-pointer">
              <XMarkIcon className="w-4" />
            </button>
          </Tooltip>
        </div>
        <div className="overflow-y-auto grow">
          {!hideHeader && (
            <Type
              style="onboardingTitle"
              className="
                flex items-center gap-[10px] p-8 pb-0!
                max-xs:flex-col max-xs:text-center
              "
            >
              <Icon className="text-primary-dark w-[42px]" />
              {title}
            </Type>
          )}
          <Type
            style="bodyMedium"
            className={clsx(
              "overflow-hidden px-8 py-[22px] leading-[140%] max-xs:text-center",
              className,
            )}
          >
            {children}
          </Type>
        </div>
        {!hideFooter && (
          <div
            className="
              flex items-center gap-7 p-6 border-t-1 border-t-gray-300
              max-xs:flex-col max-xs:border-t-none
            "
          >
            <div className="grow">{footer}</div>
            {skippable && (
              <Type
                style="bodyHeavy"
                As="a"
                onClick={onSkip}
                className="no-underline hover:underline"
              >
                Skip for now
              </Type>
            )}
            {!hideFooterButton && (
              <Button
                onClick={wrappedOnContinue}
                disabled={!canContinue || nextStageIsLoading}
                loading={nextStageIsLoading}
                className="
                  min-w-[128px] h-[44px] whitespace-nowrap px-6 py-3 max-xs:w-full
                  flex items-center gap-2 text-always-white1
                "
              >
                Continue <ArrowRightIcon className="w-4" />
              </Button>
            )}
          </div>
        )}
        <LogoutConfirmationDialog
          open={logoutDialogOpen}
          onClose={handleDialogCancel}
        />
      </div>
    </AnalyticsContext>
  );
}
