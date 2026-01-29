"use client";

import { FormEvent, useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  hideSubscribePokeAction,
  subscribeToDigestAction,
} from "@/lib/users/userActions";
import {
  AnalyticsContext,
  AnalyticsInViewTracker,
  useTracking,
} from "@/lib/analyticsEvents";
import clsx from "clsx";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import Input from "@/components/Forms/Input";
import Button from "@/components/Button";
import Type from "@/components/Type";

export default function RecentDiscussionsSubscribeReminder() {
  const { captureEvent } = useTracking();
  const { currentUser, refetchCurrentUser } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hide, setHide] = useState(false);

  const onSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (currentUser || email) {
        setLoading(true);
        try {
          await subscribeToDigestAction({ email });
          await refetchCurrentUser();
          setSuccess(true);
          captureEvent("subscribeReminderButtonClicked", {
            buttonType: "subscribeButton",
          });
        } catch (error) {
          captureException(error);
          toast.error((error as Error)?.message || "Something went wrong");
        } finally {
          setLoading(false);
        }
      } else {
        toast.error("Please enter your email address");
      }
    },
    [captureEvent, currentUser, refetchCurrentUser, email],
  );

  const onHide = useCallback(() => {
    setHide(true);
    if (currentUser) {
      void hideSubscribePokeAction();
    }
    captureEvent("subscribeReminderButtonClicked", {
      buttonType: "dontAskAgainButton",
    });
  }, [captureEvent, currentUser]);

  if (
    hide ||
    (!success && (currentUser?.subscribedToDigest || currentUser?.hideSubscribePoke))
  ) {
    return null;
  }

  return (
    <AnalyticsContext pageElementContext="subscribeReminder">
      <AnalyticsInViewTracker eventProps={{ inViewType: "subscribeReminder" }}>
        <div
          data-component="RecentDiscussionsSubscribeReminder"
          className="
            w-[520px] max-w-full bg-gray-0 rounded px-6 py-4 mx-auto my-7
            border-1 border-gray-200 flex flex-col gap-3 relative
          "
        >
          <button onClick={onHide} className="absolute right-3 top-3 cursor-pointer">
            <XMarkIcon className="w-5 text-gray-600 hover:text-gray-1000" />
          </button>
          {success ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckIcon className="w-7 text-recent-discussions-green" />
              <Type style="bodyMedium">
                You are subscribed to the EA Forum Digest
              </Type>
            </div>
          ) : (
            <>
              <Type style="postTitle" className="flex items-center gap-2 pr-8">
                <EnvelopeIcon className="w-5 text-primary" />
                Sign up for the Forum&apos;s email digest
              </Type>
              <Type style="bodySmall">
                You&apos;ll get a weekly email with the best posts from the past
                week. The Forum team selects the posts to feature based on personal
                preference and Forum popularity, and also adds some announcements and
                a classic post.
              </Type>
              <form
                onSubmit={onSubmit}
                className="flex items-center justify-center gap-3"
              >
                <Input
                  value={email}
                  setValue={setEmail}
                  placeholder="Email address"
                  className={clsx("grow", currentUser && "hidden")}
                />
                <Button type="submit" loading={loading}>
                  Subscribe
                </Button>
              </form>
            </>
          )}
        </div>
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
