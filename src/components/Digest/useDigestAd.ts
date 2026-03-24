import { useCallback, useRef, useState } from "react";
import { getBrowserLocalStorage } from "@/lib/localStorage";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";

export const digestSubscribeURL =
  "https://effectivealtruism.us8.list-manage.com/subscribe/post?u=52b028e7f799cca137ef74763&amp;id=7457c7ff3e&amp;f_id=0086c5e1f0";

/**
 * Handles some shared logic around the EA Forum digest ad:
 * in particular, logged in vs logged out forms function differently.
 * This has some functionality overlap with the Forum Digest ad that appears in
 * "Recent discussion".
 * Specifically, both components use currentUser.hideSubscribePoke,
 * so for logged in users, hiding one ad hides the other.
 * See RecentDiscussionSubscribeReminder.tsx for the other component.
 */
export const useDigestAd = () => {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const ls = getBrowserLocalStorage();
  const [isHidden, setIsHidden] = useState(
    // Logged out user clicked the X in this ad, or previously submitted the form
    (!currentUser && ls?.getItem("hideHomeDigestAd")) ||
      // User is already subscribed
      currentUser?.subscribedToDigest ||
      // User is logged in and clicked the X in this ad, or "Don't ask again" in
      // the ad in "Recent discussion"
      currentUser?.hideSubscribePoke,
  );
  const [loading, setLoading] = useState(false);
  const [subscribeClicked, setSubscribeClicked] = useState(false);

  // If the user is logged in and has an email address, we show their email
  // address and the "Subscribe" button, otherwise we show the form with the
  // email address input.
  const showForm = !currentUser?.email;

  /**
   * Close the digest ad, and make sure it doesn't appear again
   */
  const onDismiss = useCallback(() => {
    setIsHidden(true);
    captureEvent("digestAdClosed");
    if (currentUser) {
      void rpc.users.hideDigestAd();
    } else {
      ls?.setItem("hideHomeDigestAd", "true");
    }
  }, [setIsHidden, captureEvent, currentUser, ls]);

  /**
   * When the user clicks the "Sign up" button, if they are logged in, subscribe
   * them to the digest, otherwise set hideHomeDigestAd
   */
  const onSubscribe = useCallback(async () => {
    setLoading(true);
    setSubscribeClicked(true);
    captureEvent("digestAdSubscribed");

    if (currentUser) {
      try {
        const email = emailRef.current?.value;
        await rpc.users.subscribeToList({ list: "digest", email });
      } catch (e) {
        console.error(e);
        setSubscribeClicked(false);
        toast.error(
          "There was a problem subscribing you to the digest. Please try again later.",
        );
      }
    }
    if (showForm && emailRef.current?.value) {
      ls?.setItem("hideHomeDigestAd", "true");
    }

    setLoading(false);
  }, [setLoading, setSubscribeClicked, captureEvent, currentUser, showForm, ls]);

  // Make sure we only show it to logged out users if they have the ability to hide it
  if (!currentUser && !ls) {
    return {
      showDigestAd: false,
    };
  }

  // If the user just submitted the form, make sure not to hide it, so that it
  // properly finishes submitting. Alternatively, if the logged in user just
  // clicked "Subscribe", show the success text rather than hiding this.
  if (isHidden && !subscribeClicked) {
    return {
      showDigestAd: false,
    };
  }

  return {
    showDigestAd: true,
    emailRef,
    showForm,
    loading,
    subscribeClicked,
    onDismiss,
    onSubscribe,
  };
};
