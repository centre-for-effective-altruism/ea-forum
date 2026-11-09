"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import Button from "../Button";
import Type from "../Type";

export default function LoginPageContent() {
  const { currentUser } = useCurrentUser();
  const { loginAction, onLogin, onSignup } = useLoginPopoverContext();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.replace("/");
    } else {
      onLogin();
    }
  }, [currentUser, router, onLogin]);

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
