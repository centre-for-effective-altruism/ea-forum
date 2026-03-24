"use client";

import type { FC, RefObject } from "react";
import { AnalyticsContext, AnalyticsInViewTracker } from "@/lib/analyticsEvents";
import { getLocalPostsReadCount } from "@/lib/hooks/useRecordPostView";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { DigestAdProps, digestSubscribeURL, useDigestAd } from "./useDigestAd";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import clsx from "clsx";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

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
      "min-w-[240px] grow bg-always-white p-3 outline-none placeholder:text-gray-600",
      "rounded border-1 border-gray-800 focus:border-primary",
      disabled ? "text-gray-400" : "text-always-black",
    )}
    required
    disabled={disabled}
  />
);

const DigestPopupForm: FC<Omit<DigestAdProps, "showDigestAd">> = ({
  showForm,
  emailRef,
  onDismiss,
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
        className="flex grow gap-1 flex-wrap"
      >
        <Input emailRef={emailRef} />
        <div className="flex gap-1">
          <Button type="submit" onClick={onSubscribe} disabled={loading}>
            Sign up
          </Button>
          <Button variant="greyFilled" onClick={onDismiss} disabled={loading}>
            No thanks
          </Button>
        </div>
      </form>
    );
  }

  // If a logged in user with an email address subscribes, show the success message
  if (!showForm && subscribeClicked) {
    return (
      <div className="flex items-center gap-[10px] text-gray-400">
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
    <div className="flex grow gap-1 flex-wrap">
      <Input emailRef={emailRef} value={currentUser?.email ?? undefined} disabled />
      <div className="flex gap-1">
        <Button type="submit" onClick={onSubscribe} disabled={loading}>
          Sign up
        </Button>
        <Button variant="greyFilled" onClick={onDismiss} disabled={loading}>
          No thanks
        </Button>
      </div>
    </div>
  );
};

export default function DigestPopup() {
  const { showDigestAd, ...formProps } = useDigestAd();

  // We only show this after the client has viewed a few posts
  if (!showDigestAd || getLocalPostsReadCount() < 10) {
    return null;
  }

  return (
    <AnalyticsContext pageSubSectionContext="digestAd">
      <AnalyticsInViewTracker eventProps={{ inViewType: "stickyDigestAd" }}>
        <section
          data-component="DigestPopup"
          className="
            fixed bottom-7 left-[50%] translate-x-[-50%] w-[880px] max-w-[85%]
            rounded shadow px-5 py-4 flex items-center justify-between gap-5
            bg-gray-900 border-1 border-gray-700 text-gray-0 print:hidden
            z-(--zindex-digest-popup) animate-fade-in [animation-duration:1s]
          "
        >
          <div>
            <Type style="postTitle" className="mb-[2px]">
              Sign up for the weekly EA Forum Digest
            </Type>
            <Type style="bodyMedium" className="text-gray-400">
              A curated reading list of Forum posts, every Wednesday
            </Type>
          </div>
          <DigestPopupForm {...formProps} />
        </section>
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
