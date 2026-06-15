import { SubmitEvent, useCallback, useEffect, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useOnboarding } from "./useOnboarding";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import OnboardingStage from "./OnboardingStage";
import OnboardingInput from "./OnboardingInput";
import Type from "../Type";
import Link from "../Link";

export default function OnboardingUserStage() {
  const {
    goToNextStage,
    goToNextStageAfter,
    captureOnboardingEvent,
    currentUser,
    viewAsAdmin,
  } = useOnboarding();
  const [name, setName] = useState("");
  const [nameTaken, setNameTaken] = useState(false);
  const [acceptedTos, setAcceptedTos] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const onToggleAcceptedTos = useCallback(
    (ev: React.MouseEvent) => {
      if ((ev.target as HTMLElement).tagName !== "A") {
        setAcceptedTos((value) => {
          const newValue = !value;
          captureOnboardingEvent("toggledTos", { newValue });
          return newValue;
        });
      }
    },
    [captureOnboardingEvent],
  );

  const onContinue = useCallback(async () => {
    if (viewAsAdmin) {
      await goToNextStage();
      return;
    }
    await goToNextStageAfter(
      rpc.users.completeUserProfile({
        name,
        acceptedTos,
      }),
    );
  }, [name, acceptedTos, goToNextStage, goToNextStageAfter, viewAsAdmin]);

  const onSubmit = useCallback(
    async (ev: SubmitEvent<HTMLFormElement>) => {
      ev.preventDefault();
      await onContinue();
    },
    [onContinue],
  );

  useEffect(() => {
    void (async () => {
      setNameTaken(false);
      if (name) {
        try {
          const id = ++requestId.current;
          const isTaken = await rpc.users.isDisplayNameTaken({ displayName: name });
          if (id === requestId.current) {
            setNameTaken(!!isTaken && name !== currentUser.displayName);
          }
        } catch (e) {
          captureException(e);
          console.error("isDisplayNameTaken:", e);
        }
      }
    })();
  }, [currentUser.displayName, name]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus?.();
    }, 0);
  }, []);

  const canContinue = !!name && !nameTaken && acceptedTos;
  return (
    <OnboardingStage
      stageName="user"
      title="Choose your user name"
      footer={
        <button
          onClick={onToggleAcceptedTos}
          className="cursor-pointer flex gap-2 color-gray-600 text-left"
        >
          <CheckIcon
            className={clsx(
              "mt-1 rounded-[4px] min-w-[14px] w-[14px] h-[14px]",
              acceptedTos
                ? "bg-primary-dark text-always-white"
                : "border-1 border-gray-400 [&_path]:opacity-0",
            )}
          />
          <Type className="select-none">
            I agree to the{" "}
            <Link href="/termsOfUse" openInNewTab>
              terms of use
            </Link>
            , including my content being available under a{" "}
            <Link href="https://creativecommons.org/licenses/by/4.0/" openInNewTab>
              Creative Commons Attribution 4.0
            </Link>{" "}
            license.
          </Type>
        </button>
      }
      onContinue={onContinue}
      canContinue={canContinue}
      thin
      className="flex flex-col gap-3 mb-15 text-gray-900 leading-[140%]"
    >
      <Type>Many Forum users use their real name.</Type>
      <form onSubmit={onSubmit}>
        <OnboardingInput
          value={name}
          setValue={setName}
          placeholder="Spaces and special characters allowed"
          inputRef={inputRef}
        />
      </form>
      {nameTaken && (
        <Type className="text-error">&quot;{name}&quot; is already taken</Type>
      )}
      <Type className="text-gray-600">
        If you’d rather use a pseudonym, we recommend{" "}
        <Link
          href="https://jimpix.co.uk/words/random-username-generator.asp"
          openInNewTab
        >
          something memorable like &quot;WobblyPanda&quot;
        </Link>{" "}
        instead of a generic name like “Anonymous 238”.
      </Type>
    </OnboardingStage>
  );
}
