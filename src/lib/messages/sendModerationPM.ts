import type { CommentListItem } from "../comments/commentLists";
import { createConversation, createMessage } from "./messageMutations";
import { captureServerEvent } from "../analytics/captureServerEvent";
import { fetchAdminAccount } from "../users/adminAccount";

export const sendModerationPM = async ({
  action,
  messageContents,
  comment,
  noEmail,
  contentTitle,
}: {
  action: "deleted" | "rejected";
  messageContents: string;
  comment: CommentListItem;
  noEmail: boolean;
  contentTitle?: string | null;
}) => {
  if (!comment.user) {
    throw new Error("Comment has no user");
  }
  const admin = await fetchAdminAccount();
  const conversation = await createConversation(admin, {
    participantIds: [comment.user._id, admin._id],
    title: `Comment ${action} on ${contentTitle}`,
    ...(action === "rejected" ? { moderator: true } : {}),
  });
  await createMessage({
    user: admin,
    html: messageContents,
    conversation: conversation,
    noEmail,
  });
  captureServerEvent("commentModerationMessage", { commentId: comment._id });
};
