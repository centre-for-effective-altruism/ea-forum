import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTracking } from "../analyticsEvents";
import { captureException } from "@sentry/nextjs";
import { useCurrentUser } from "./useCurrentUser";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { conversationGetPageUrl } from "../messages/messageHelpers";
import { rpc } from "../rpc";
import toast from "react-hot-toast";
import { ORPCError } from "@orpc/client";

export const useInitiateConversation = () => {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const router = useRouter();

  const initiateConversation = useCallback(
    async ({
      userIds,
      includeModerators = false,
      redirectOnSuccess = false,
      isModInbox,
      from,
      openInNewTab = false,
    }: {
      userIds: string[];
      includeModerators?: boolean;
      redirectOnSuccess?: boolean;
      isModInbox?: boolean;
      from?: string;
      openInNewTab?: boolean;
    }): Promise<string | null> => {
      if (!userIds.length) {
        throw new Error("No users in conversation");
      }

      if (!currentUser) {
        onSignup();
        return null;
      }

      try {
        const conversationId = await rpc.messages.createConversation({
          userIds,
          includeModerators,
        });
        captureEvent("initiateConversation", { userIds, includeModerators });
        if (redirectOnSuccess) {
          const url = conversationGetPageUrl({
            conversationId,
            isModInbox,
            from,
          });
          if (openInNewTab) {
            window.open(url, "_blank");
          } else {
            router.push(url);
          }
        }
        return conversationId;
      } catch (e) {
        captureException(e);
        console.error("Error initiating conversation:", e);
        toast.error(
          e instanceof ORPCError && e.code === "FORBIDDEN"
            ? e.message
            : "An error occurred - please try again",
        );
        return null;
      }
    },
    [router, currentUser, onSignup, captureEvent],
  );

  return { initiateConversation };
};
