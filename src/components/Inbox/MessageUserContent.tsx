import { redirect } from "next/navigation";
import { ORPCError } from "@orpc/server";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchUserBySlug } from "@/lib/users/userQueries";
import { findOrCreateConversation } from "@/lib/messages/messageMutations";
import { conversationGetPageUrl } from "@/lib/messages/messageHelpers";
import Type from "../Type";

const ErrorMessage = ({ message }: { message: string }) => (
  <Type style="bodyMedium" className="text-gray-1000">
    {message}
  </Type>
);

export default async function MessageUserContent({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const [currentUser, { slug }] = await Promise.all([getCurrentUser(), params]);
  if (!currentUser) {
    return <ErrorMessage message="Log in to access private messages." />;
  }

  const user = await fetchUserBySlug(currentUser, slug);
  if (!user) {
    return (
      <ErrorMessage message="Failed to create conversation: User could not be found." />
    );
  }
  if (user._id === currentUser._id) {
    return (
      <ErrorMessage message="Failed to create conversation: You cannot create a conversation with yourself." />
    );
  }

  let conversationId: string;
  try {
    conversationId = await findOrCreateConversation(currentUser, {
      userIds: [user._id],
      moderator: false,
    });
  } catch (e) {
    if (e instanceof ORPCError && e.code === "FORBIDDEN") {
      return (
        <ErrorMessage message={`Failed to create conversation: ${e.message}`} />
      );
    }
    throw e;
  }

  redirect(conversationGetPageUrl({ conversationId, from: "magic_link" }));
}
