import { ChangeEvent, useCallback, useEffect, useState, useTransition } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useAuth0Client } from "@/lib/hooks/useAuth0Client";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { loginAction } from "@/lib/users/authActions";
import Image from "next/image";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import Popover from "../Popover";
import LightbulbIcon from "../Icons/LightbulbIcon";
import PasswordPolicy from "./PasswordPolicy";
import LoginInput from "./LoginInput";
import Loading from "../Loading";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

// TODO Setup sentry
const captureException = (_error: unknown, _context: unknown) => {};

export default function LoginPopover() {
  const { loginAction: action, setLoginAction: setAction } =
    useLoginPopoverContext();
  const open = !!action;
  const isSignup = action === "signup";

  const client = useAuth0Client();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { setCurrentUser } = useCurrentUser();

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
    startTransition(async () => {
      try {
        setError(null);
        setPolicy(null);
        setMessage(null);
        await client.resetPassword(email);
        setMessage("Password reset email sent");
      } catch (err) {
        const e = err as Error & { description?: string };
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
    });
  }, [client, email, action, isSignup, isResettingPassword]);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      setPolicy(null);

      if (isResettingPassword) {
        return onSendPasswordReset();
      }

      const email = formData.get("email");
      const password = formData.get("password");
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }
      if (typeof email !== "string" || typeof password !== "string") {
        setError("Invalid field values");
        return;
      }

      try {
        // TODO Handle signup with `isSignup`
        const result = await loginAction(email, password);
        if (result?.redirect) {
          window.location.href = result.redirect;
        } else if (!result?.ok || !result?.currentUser) {
          console.error("Login error:", result);
          setError(result.error ?? "An error occurred");
        } else {
          setCurrentUser(result.currentUser);
        }
      } catch (err) {
        const e = err as Error & { description?: string; policy?: string };
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
      }
    });
  };

  const onClickGoogle = useCallback(async () => {
    const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    if (!domain) {
      setError("Auth0 domain not configured");
      return;
    }
    setMessage(null);
    setError(null);
    setPolicy(null);
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      response_type: "code",
      scope: "openid profile email",
      redirect_uri: `${window.location.origin}/auth/auth0/callback`,
      connection: "google-oauth2",
      state: btoa(
        JSON.stringify({
          returnTo: window.location.pathname + window.location.search,
        }),
      ),
    });
    window.location.href = `https://${domain}/authorize?${params}`;
  }, []);

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
      setMessage(null);
      setError(null);
      setPolicy(null);
      setIsResettingPassword(false);
    }
  }, [open]);

  const title = isSignup ? "Sign up to get more from the EA Forum" : "Welcome back";

  const canSubmit = !!email && (!!password || isResettingPassword) && !pending;
  return (
    <Popover
      open={open}
      onClose={onClose}
      background="blurred"
      className="w-[386px]"
    >
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
          <form action={onSubmit} className="flex flex-col gap-2 w-full">
            <LoginInput
              value={email}
              onChange={onChangeEmail}
              placeholder="Email"
              name="email"
              testId="login-email-input"
              autoFocus
            />
            <LoginInput
              value={password}
              onChange={onChangePassword}
              placeholder="Password"
              name="password"
              testId="login-password-input"
              secure={showPassword ? "revealed" : "hidden"}
              onToggleRevealed={toggleShowPassword}
            />
            {!isSignup && !isResettingPassword && (
              <Type className="mt-1 mb-2 font-[600] text-(--color-primary)">
                <a className="cursor-pointer" onClick={onForgotPassword}>
                  Forgot password?
                </a>
              </Type>
            )}
            {message && <Type className="mb-1">{message}</Type>}
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
              {pending ? (
                <Loading />
              ) : isResettingPassword ? (
                "Request password reset"
              ) : isSignup ? (
                "Sign up"
              ) : (
                "Login"
              )}
            </Button>
          </form>
          <div className="flex items-center gap-3 w-full text-gray-600">
            <span className="grow border-t border-gray-600" />
            <Type As="span" style="bodySmall">
              OR
            </Type>
            <span className="grow border-t border-gray-600" />
          </div>
          <Button
            variant="greyOutlined"
            onClick={onClickGoogle}
            className="w-full h-[50px] px-[17px] py-[15px] font-[600] flex gap-2"
          >
            <Image
              src="/googleLogo.png"
              alt="Containue with google"
              width={20}
              height={20}
              className="w-[20px] h-[20px]"
            />
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
              Don&apos;t have an account?{" "}
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
              </Link>
              .
            </Type>
          )}
        </div>
      </AnalyticsContext>
    </Popover>
  );
}
