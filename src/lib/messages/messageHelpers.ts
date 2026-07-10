import type { Message } from "../schema";
import { getSiteUrl } from "../routeHelpers";

export const messageGetPageUrl = ({
  message,
  isAbsolute,
}: {
  message: Pick<Message, "conversationId">;
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  return `${prefix}/inbox/${message.conversationId}`;
};
