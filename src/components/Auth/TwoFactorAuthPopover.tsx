"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ORPCError } from "@orpc/client";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import Popover from "../Popover";
import Input from "../Forms/Input";
import Loading from "../Loading";
import Button from "../Button";
import Type from "../Type";

type Stage =
  | { name: "loading" }
  | { name: "loadError" }
  | { name: "disabled" }
  | { name: "enabled"; recoveryCodesRemaining: number }
  | { name: "scan"; secret: string; qrCodeDataUrl: string }
  | { name: "confirmDisable" }
  | { name: "confirmRegenerate" }
  | { name: "recoveryCodes"; recoveryCodes: string[] };

const TwoFactorAuthDialog = ({ onClose }: { onClose: () => void }) => {
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadStatus = useCallback(async () => {
    try {
      const { enabled, recoveryCodesRemaining } = await rpc.twoFactorAuth.status();
      setStage(
        enabled ? { name: "enabled", recoveryCodesRemaining } : { name: "disabled" },
      );
    } catch (e) {
      console.error(e);
      captureException(e);
      setStage({ name: "loadError" });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runAction = (action: () => Promise<Stage>) => {
    startTransition(async () => {
      setError(null);
      try {
        const nextStage = await action();
        setCode("");
        setStage(nextStage);
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

  const onBeginSetup = () =>
    runAction(async () => ({
      name: "scan",
      ...(await rpc.twoFactorAuth.beginSetup()),
    }));

  const onConfirmSetup = () =>
    runAction(async () => ({
      name: "recoveryCodes",
      ...(await rpc.twoFactorAuth.confirmSetup({ code })),
    }));

  const onDisable = () =>
    runAction(async () => {
      await rpc.twoFactorAuth.disable({ code });
      toast.success("Two-factor authentication disabled");
      return { name: "disabled" };
    });

  const onRegenerate = () =>
    runAction(async () => ({
      name: "recoveryCodes",
      ...(await rpc.twoFactorAuth.regenerateRecoveryCodes({ code })),
    }));

  const onCancel = () => {
    setCode("");
    setError(null);
    setStage({ name: "loading" });
    void loadStatus();
  };

  const onCopyRecoveryCodes = async (recoveryCodes: string[]) => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast.success("Copied recovery codes to clipboard");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const errorMessage = error && <Type className="text-error">{error}</Type>;

  const codeForm = (submitLabel: string, onSubmit: () => void) => (
    <form action={onSubmit} className="flex flex-col gap-4">
      <Input
        value={code}
        setValue={setCode}
        label="Authentication code"
        placeholder="6-digit code or recovery code"
      />
      {errorMessage}
      <div className="flex gap-2 justify-end">
        <Button variant="greyOutlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} disabled={!code || pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  const renderStage = () => {
    switch (stage.name) {
      case "loading":
        return <Loading className="my-6" />;
      case "loadError":
        return (
          <Type className="text-error">
            Failed to load your two-factor authentication settings - please try again
          </Type>
        );
      case "disabled":
        return (
          <div className="flex flex-col gap-4">
            <Type>
              Two-factor authentication adds an extra layer of security to your
              account. After entering your password or logging in with Google,
              you&apos;ll also need to enter a code from an authenticator app such as
              1Password, Google Authenticator or Authy.
            </Type>
            {errorMessage}
            <div className="flex gap-2 justify-end">
              <Button variant="greyOutlined" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onBeginSetup} loading={pending}>
                Get started
              </Button>
            </div>
          </div>
        );
      case "scan":
        return (
          <div className="flex flex-col gap-4">
            <Type>
              Scan this QR code with your authenticator app, then enter the 6-digit
              code it shows to finish setting up.
            </Type>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stage.qrCodeDataUrl}
              alt="Two-factor authentication QR code"
              className="w-[200px] h-[200px] mx-auto bg-always-white rounded"
            />
            <Type style="bodySmall" className="text-gray-600 text-center">
              Can&apos;t scan the code? Enter this key manually instead:
              <span className="block mt-1 font-mono break-all select-all text-gray-1000">
                {stage.secret}
              </span>
            </Type>
            {codeForm("Enable", onConfirmSetup)}
          </div>
        );
      case "recoveryCodes":
        return (
          <div className="flex flex-col gap-4">
            <Type>
              Save these recovery codes somewhere safe. Each code can be used once to
              log in if you lose access to your authenticator app. You won&apos;t be
              able to see them again.
            </Type>
            <ul className="grid grid-cols-2 gap-2 p-4 rounded bg-gray-100">
              {stage.recoveryCodes.map((recoveryCode) => (
                <li key={recoveryCode}>
                  <Type className="font-mono text-center">{recoveryCode}</Type>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end">
              <Button
                variant="greyOutlined"
                onClick={() => onCopyRecoveryCodes(stage.recoveryCodes)}
              >
                Copy codes
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        );
      case "enabled":
        return (
          <div className="flex flex-col gap-4">
            <Type>
              Two-factor authentication is enabled. You have{" "}
              {stage.recoveryCodesRemaining} recovery code
              {stage.recoveryCodesRemaining === 1 ? "" : "s"} remaining.
            </Type>
            <div className="flex gap-2 justify-end">
              <Button
                variant="greyOutlined"
                onClick={() => setStage({ name: "confirmRegenerate" })}
              >
                New recovery codes
              </Button>
              <Button
                variant="greyOutlined"
                onClick={() => setStage({ name: "confirmDisable" })}
              >
                Disable
              </Button>
            </div>
          </div>
        );
      case "confirmRegenerate":
        return (
          <div className="flex flex-col gap-4">
            <Type>
              Enter a code to generate new recovery codes. Your existing recovery
              codes will stop working.
            </Type>
            {codeForm("Generate codes", onRegenerate)}
          </div>
        );
      case "confirmDisable":
        return (
          <div className="flex flex-col gap-4">
            <Type>Enter a code to disable two-factor authentication.</Type>
            {codeForm("Disable", onDisable)}
          </div>
        );
    }
  };

  return (
    <Popover
      open
      onClose={onClose}
      noCloseOnOutsideClick={stage.name === "recoveryCodes"}
      className="w-[440px] max-w-full"
    >
      <AnalyticsContext pageElementContext="twoFactorAuthPopover">
        <div
          data-component="TwoFactorAuthPopover"
          className="flex flex-col gap-4 relative"
        >
          <XMarkIcon
            onClick={onClose}
            className="cursor-pointer w-[20px] text-gray-600 absolute right-0 top-0"
          />
          <Type style="postTitle" className="pr-8">
            Two-factor authentication
          </Type>
          {renderStage()}
        </div>
      </AnalyticsContext>
    </Popover>
  );
};

export default function TwoFactorAuthPopover({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  return open ? <TwoFactorAuthDialog onClose={onClose} /> : null;
}
