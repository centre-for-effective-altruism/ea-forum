import { ChangeEvent, useCallback, useState, useTransition } from "react";
import { ORPCError } from "@orpc/client";
import { captureException } from "@sentry/nextjs";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { rpc } from "@/lib/rpc";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import LightbulbIcon from "../Icons/LightbulbIcon";
import LoginInput from "./LoginInput";
import Button from "../Button";
import Type from "../Type";

export default function TwoFactorLoginForm({
  onClose,
  onBackToLogin,
}: Readonly<{
  onClose: () => void;
  onBackToLogin: () => void;
}>) {
  const { setCurrentUser } = useCurrentUser();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onChangeCode = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setCode(ev.target.value);
  }, []);

  const onSubmit = () => {
    startTransition(async () => {
      setError(null);
      try {
        const { currentUser } = await rpc.twoFactorAuth.verifyLogin({ code });
        setCurrentUser(currentUser);
      } catch (e) {
        if (e instanceof ORPCError) {
          setError(e.message);
        } else {
          console.error(e);
          captureException(e);
          setError("Something went wrong");
        }
      }
    });
  };

  return (
    <AnalyticsContext pageElementContext="twoFactorLoginForm">
      <div
        className="w-full flex flex-col gap-6 items-center text-center relative"
        data-component="TwoFactorLoginForm"
      >
        <XMarkIcon
          onClick={onClose}
          className="cursor-pointer w-[20px] text-gray-600 absolute right-0 top-0"
        />
        <LightbulbIcon className="w-[52px] text-primary-dark" />
        <Type className="text-[24px] font-[600]">Two-factor authentication</Type>
        <Type>
          Enter the 6-digit code from your authenticator app, or one of your recovery
          codes.
        </Type>
        <form action={onSubmit} className="flex flex-col gap-2 w-full">
          <LoginInput
            value={code}
            onChange={onChangeCode}
            placeholder="Code"
            name="code"
            testId="two-factor-code-input"
            autoComplete="one-time-code"
            autoFocus
          />
          {error && <Type className="my-2 text-red-500">{error}</Type>}
          <Button
            type="submit"
            loading={pending}
            disabled={!code || pending}
            testId="two-factor-submit"
            className="w-full h-[50px] px-[17px] py-[15px] font-[600] mt-2"
          >
            Verify
          </Button>
        </form>
        <Type>
          <a
            onClick={onBackToLogin}
            className="
              text-primary hover:text-primary-dark
              font-[700] cursor-pointer select-none
            "
          >
            Back to login
          </a>
        </Type>
      </div>
    </AnalyticsContext>
  );
}
