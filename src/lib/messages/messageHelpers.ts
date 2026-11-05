import type { Message } from "../schema";
import { getSiteUrl } from "../routeHelpers";

export const conversationGetPageUrl = ({
  conversationId,
  isAbsolute,
  from,
}: {
  conversationId: string;
  isAbsolute?: boolean;
  from?: string;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  const query = from ? `?${new URLSearchParams({ from })}` : "";
  return `${prefix}/inbox/${conversationId}${query}`;
};

export const messageGetPageUrl = ({
  message,
  isAbsolute,
}: {
  message: Pick<Message, "conversationId">;
  isAbsolute?: boolean;
}) => conversationGetPageUrl({ conversationId: message.conversationId, isAbsolute });
