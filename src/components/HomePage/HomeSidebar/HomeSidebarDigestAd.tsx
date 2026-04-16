"use client";

import { FC, RefObject } from "react";
import { AnalyticsContext, AnalyticsInViewTracker } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  DigestAdProps,
  digestSubscribeURL,
  useDigestAd,
} from "@/components/Digest/useDigestAd";
import clsx from "clsx";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ArrowRightIcon from "@heroicons/react/24/solid/ArrowRightIcon";
import Button from "@/components/Button";
import Type from "@/components/Type";
import Link from "@/components/Link";

const Input: FC<{
  value?: string;
  emailRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}> = ({ value, emailRef, disabled }) => (
  <input
    value={value}
    ref={emailRef}
    name="EMAIL"
    placeholder="Email address"
    className={clsx(
      "grow bg-gray-0 p-2 outline-none placeholder:text-gray-600 min-w-0",
      "rounded border-1 border-gray-300 focus:border-primary text-[13px]",
      disabled ? "text-gray-400" : "text-always-black",
    )}
    required
    disabled={disabled}
  />
);

const DigestSidebarForm: FC<Omit<DigestAdProps, "showDigestAd">> = ({
  showForm,
  emailRef,
  onSubscribe,
  loading,
  subscribeClicked,
}) => {
  const { currentUser } = useCurrentUser();
  // If logged out, show the form to submit to Mailchimp directly
  if (showForm && !currentUser) {
    return (
      <form
        method="post"
        action={digestSubscribeURL}
        className="flex grow gap-1 min-w-0"
      >
        <Input emailRef={emailRef} />
        <Button
          type="submit"
          onClick={onSubscribe}
          disabled={loading}
          className="aspect-square shrink-0"
        >
          <ArrowRightIcon title="Sign up" className="w-4" />
        </Button>
      </form>
    );
  }

  // If a logged in user with an email address subscribes, show the success message
  if (!showForm && subscribeClicked) {
    return (
      <div className="flex items-center gap-[10px]">
        <CheckCircleIcon className="w-12 text-new-user-sprout" />
        <Type>
          Thanks for signing up! You can edit your subscription via your{" "}
          <Link
            href="/account?highlightField=subscribedToDigest"
            className="text-primary hover:opacity-50"
          >
            account settings
          </Link>
          .
        </Type>
      </div>
    );
  }

  // User is logged in and we have their email, so no need to show the email input
  return (
    <div className="flex grow gap-1 min-w-0">
      <Input emailRef={emailRef} value={currentUser?.email ?? undefined} disabled />
      <Button
        type="submit"
        onClick={onSubscribe}
        disabled={loading}
        className="aspect-square shrink-0"
      >
        <ArrowRightIcon title="Sign up" className="w-4" />
      </Button>
    </div>
  );
};

export default function HomeSidebarDigestAd({
  className = "",
}: Readonly<{
  className?: string;
}>) {
  const { showDigestAd, ...formProps } = useDigestAd();
  if (!showDigestAd) {
    return null;
  }
  return (
    <AnalyticsContext pageSubSectionContext="digestAd">
      <AnalyticsInViewTracker eventProps={{ inViewType: "sidebarDigestAd" }}>
        <div
          className={`bg-gray-200 px-4 py-3 rounded ${className}`}
          data-component="HomeSidebarDigestAd"
        >
          <Type className="font-[600] text-[16px] mb-2">
            Sign up for the weekly EA Forum Digest
          </Type>
          <Type className="text-gray-600 leading-[18px] mb-2">
            A curated reading list of Forum posts, every Wednesday
          </Type>
          <DigestSidebarForm {...formProps} />
        </div>
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
