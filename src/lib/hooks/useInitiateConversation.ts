import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTracking } from "../analyticsEvents";
import { captureException } from "@sentry/nextjs";
import { useCurrentUser } from "./useCurrentUser";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { conversationGetPageUrl } from "../messages/messageHelpers";
import { rpc } from "../rpc";
import toast from "react-hot-toast";

export const useInitialConversation = () => {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const router = useRouter();

  const initiateConversation = useCallback(
    async ({
      userIds,
      includeModerators = false,
      redirectOnSuccess = false,
    }: {
      userIds: string[];
      includeModerators?: boolean;
      redirectOnSuccess?: boolean;
    }) => {
      if (!userIds.length) {
        throw new Error("No users in conversation");
      }

      if (!currentUser) {
        onSignup();
        return;
      }

      try {
        const conversationId = await rpc.messages.createConversation({
          userIds,
          includeModerators,
        });
        captureEvent("initiateConversation", { userIds, includeModerators });
        if (redirectOnSuccess) {
          router.push(conversationGetPageUrl({ conversationId }));
        }
      } catch (e) {
        captureException(e);
        console.error("Error initiating conversaion:", e);
        toast.error("An error occurred - please try again");
      }
    },
    [router, currentUser, onSignup, captureEvent],
  );

  return { initiateConversation };
};
