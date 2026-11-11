"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { sanitizeReturnTo } from "@/lib/routeHelpers";
import Button from "../Button";
import Type from "../Type";

export default function LoginPageContent() {
  const { currentUser } = useCurrentUser();
  const { loginAction, setLoginAction, onLogin, onSignup, setReturnTo } =
    useLoginPopoverContext();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const initialAction = searchParams.get("twoFactor")
    ? "twoFactor"
    : searchParams.get("signup")
      ? "signup"
      : "login";

  useEffect(() => {
    if (currentUser) {
      // Full page load because returnTo may be a legacy site page
      window.location.replace(returnTo);
    } else {
      setReturnTo(returnTo);
      setLoginAction(initialAction);
    }
  }, [currentUser, returnTo, setReturnTo, setLoginAction, initialAction]);

  if (currentUser || loginAction) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Type>Log in or sign up to get more from the EA Forum.</Type>
      <div className="flex gap-2">
        <Button variant="greyFilled" onClick={onLogin}>
          Login
        </Button>
        <Button variant="primaryFilled" onClick={onSignup}>
          Sign up
        </Button>
      </div>
    </div>
  );
}
