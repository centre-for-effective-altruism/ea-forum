import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useAuth0Client } from "@/lib/hooks/useAuth0Client";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import BlurredBackgroundModal from "../BlurredBackgroundModal";
import LightbulbIcon from "../icons/LightbulbIcon";
import PasswordPolicy from "./PasswordPolicy";
import LoginInput from "./LoginInput";
import Loading from "../Loading";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

// TODO Setup sentry
const captureException = (_error: any, _context: any) => {}

export default function LoginPopover() {
  const {loginAction: action, setLoginAction: setAction} = useLoginPopoverContext();
  const open = !!action;
  const isSignup = action === "signup";

  const client = useAuth0Client();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<string | null>(null);
  const { refetchCurrentUser } = useCurrentUser();

  const onChangeEmail = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setEmail(ev.target.value);
  }, []);

  const onChangePassword = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setPassword(ev.target.value);
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((showPassword) => !showPassword);
  }, []);

  const onSendPasswordReset = useCallback(async () => {
    setError(null);
    setPolicy(null);
    setMessage(null);
    try {
      setLoading(true);
      await client.resetPassword(email);
      setMessage("Password reset email sent");
    } catch(err) {
      const e = err as Error & {description?: string};
      // eslint-disable-next-line no-console
      console.error(e);
      captureException(e, {
        tags: {
          component: "EALoginPopover",
          action: action || "unknown",
        },
        extra: {
          email,
          isSignup,
          isResettingPassword,
        },
      });
      setError(e.description || e.message || String(e) || "An error occurred");
    }
    setLoading(false);
  }, [client, email, action, isSignup, isResettingPassword]);

  const onSubmit = useCallback(async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    if (isResettingPassword) {
      return onSendPasswordReset();
    }

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setMessage(null);
    setError(null);
    setPolicy(null);

    try {
      setLoading(true);
      await (
        isSignup
          ? client.signup(email, password)
          : client.login(email, password)
      );
      await refetchCurrentUser();
    } catch (err) {
      const e = err as Error & {description?: string, policy?: string};
      // eslint-disable-next-line no-console
      console.error(e);
      captureException(e, {
        tags: {
          component: "EALoginPopover",
          action: action || "unknown",
        },
        extra: {
          email,
          isSignup,
          isResettingPassword,
        },
      });
      setError(e.description || e.message || String(e) || "An error occurred");
      setPolicy(e.policy ?? null);
    } finally {
      setLoading(false);
    }
  }, [isResettingPassword, email, password, onSendPasswordReset, isSignup, client, refetchCurrentUser, action]);

  const onClickGoogle = useCallback(async () => {
    setMessage(null);
    setError(null);
    setPolicy(null);
    client.socialLogin("google-oauth2");
  }, [client]);

  const onForgotPassword = useCallback(() => {
    setIsResettingPassword(true);
  }, []);

  const onLinkToLogin = useCallback(() => {
    setAction("login");
  }, [setAction]);

  const onLinkToSignup = useCallback(() => {
    setAction("signup");
  }, [setAction]);

  const onClose = useCallback(() => {
    setAction(null);
  }, [setAction]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setLoading(false);
      setMessage(null);
      setError(null);
      setPolicy(null);
      setIsResettingPassword(false);
    }
  }, [open]);

  const title = isSignup
    ? "Sign up to get more from the EA Forum"
    : "Welcome back";

  const canSubmit = !!email && (!!password || isResettingPassword) && !loading;
  return (
    <BlurredBackgroundModal open={open} onClose={onClose}>
      <AnalyticsContext pageElementContext="loginPopover">
        <div
          className="w-full flex flex-col gap-6 items-center text-center relative"
          data-component="LoginPopover"
        >
          <XMarkIcon
            onClick={onClose}
            className="cursor-pointer w-[20px] text-gray-600 absolute right-0 top-0"
          />
          <LightbulbIcon className="w-[52px] text-(--color-primary-dark)" />
          <Type className="text-[24px] font-[600]">{title}</Type>
          <form onSubmit={onSubmit} className="flex flex-col gap-2 w-full">
            <LoginInput
              value={email}
              onChange={onChangeEmail}
              placeholder="Email"
              testId="login-email-input"
              autoFocus
            />
            <LoginInput
              value={password}
              onChange={onChangePassword}
              placeholder="Password"
              testId="login-password-input"
              secure={showPassword ? "revealed" : "hidden"}
              onToggleRevealed={toggleShowPassword}
            />
            {!isSignup && !isResettingPassword &&
              <Type className="mt-1 mb-2 font-[600] text-(--color-primary)">
                <a className="cursor-pointer" onClick={onForgotPassword}>
                  Forgot password?
                </a>
              </Type>
            }
            {message &&
              <Type className="mb-1">
                {message}
              </Type>
            }
            {error && (
              <Type className="mb-4 text-red-500">
                {error}
                {policy && <PasswordPolicy policy={policy} />}
              </Type>
            )}
            <Button
              type="submit"
              disabled={!canSubmit}
              testId="login-submit"
              className="w-full h-[50px] px-[17px] py-[15px] font-[600]"
            >
              {loading
                ? <Loading />
                : isResettingPassword
                  ? "Request password reset"
                  : isSignup
                    ? "Sign up"
                    : "Login"
              }
            </Button>
          </form>
          <div className="flex items-center gap-3 w-full text-gray-600">
            <span className="grow border-t border-gray-600" />
            <Type As="span" style="bodySmall">OR</Type>
            <span className="grow border-t border-gray-600" />
          </div>
          <Button
            variant="greyOutlined"
            onClick={onClickGoogle}
            className="w-full h-[50px] px-[17px] py-[15px] font-[600] flex gap-2"
          >
            <img src="/googleLogo.png" alt="Containue with google" />
            <Type>Continue with Google</Type>
          </Button>
          {isSignup ? (
            <Type>
              Already have an account?{" "}
              <a
                onClick={onLinkToLogin}
                className={`
                  text-(--color-primary) hover:text-(--color-primary-dark)
                  font-[700] cursor-pointer select-none
                `}
              >
                Login
              </a>
            </Type>
          ) : (
            <Type>
              Don't have an account?{" "}
              <a
                onClick={onLinkToSignup}
                className={`
                  text-(--color-primary) hover:text-(--color-primary-dark)
                  font-[700] cursor-pointer select-none
                `}
              >
                Sign up
              </a>
            </Type>
          )}
          {isSignup && (
            <Type style="bodySmall" className="color-gray-600 mt-2">
              By creating an EA Forum account, you agree to the{" "}
              <Link
                openInNewTab
                href="/termsOfUse"
                className="underline hover:no-underline"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                openInNewTab
                href="/privacyPolicy"
                className="underline hover:no-underline"
              >
                Privacy Policy
              </Link>.
            </Type>
          )}
        </div>
      </AnalyticsContext>
    </BlurredBackgroundModal>
  );
}
