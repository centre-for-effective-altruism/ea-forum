import type { Metadata } from "next";
import type { NextSearchParams } from "@/lib/typeHelpers";
import InboxPage from "@/components/Inbox/InboxPage";

export const metadata: Metadata = {
  title: "Moderator Inbox",
  robots: "noindex",
};

export default function ModeratorInboxConversation({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ _id: string }>;
  searchParams: Promise<NextSearchParams>;
}>) {
  return (
    <InboxPage
      conversationId={params.then(({ _id }) => _id)}
      searchParams={searchParams}
      isModInbox
    />
  );
}
