import type { Metadata } from "next";
import type { NextSearchParams } from "@/lib/typeHelpers";
import InboxPage from "@/components/Inbox/InboxPage";

export const metadata: Metadata = {
  title: "Moderator Inbox",
  robots: "noindex",
};

export default function ModeratorInbox({
  searchParams,
}: Readonly<{
  searchParams: Promise<NextSearchParams>;
}>) {
  return <InboxPage searchParams={searchParams} isModInbox />;
}
