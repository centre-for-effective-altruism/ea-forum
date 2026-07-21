import type { Message } from "../schema";
import { getSiteUrl } from "../routeHelpers";

export const conversationGetPageUrl = ({
  conversationId,
  isAbsolute,
}: {
  conversationId: string;
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  return `${prefix}/inbox/${conversationId}`;
};

export const messageGetPageUrl = ({
  message,
  isAbsolute,
}: {
  message: Pick<Message, "conversationId">;
  isAbsolute?: boolean;
}) => conversationGetPageUrl({ conversationId: message.conversationId, isAbsolute });
