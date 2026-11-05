import { Suspense } from "react";
import type { NextSearchParams } from "@/lib/typeHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import InboxPageContent from "./InboxPageContent";
import Loading from "../Loading";

const getPageContext = (isModInbox: boolean, hasConversation: boolean) => {
  if (isModInbox) {
    return "moderatorInbox";
  }
  return hasConversation ? "conversation" : "inbox";
};

export default function InboxPage({
  conversationId,
  searchParams,
  isModInbox = false,
}: Readonly<{
  conversationId?: Promise<string>;
  searchParams: Promise<NextSearchParams>;
  isModInbox?: boolean;
}>) {
  return (
    <AnalyticsContext pageContext={getPageContext(isModInbox, !!conversationId)}>
      <div
        data-component="InboxPage"
        className="
          w-[1100px] max-w-full mx-auto sm:px-6 sm:py-6 flex flex-col
          sm:h-[calc(100dvh-66px)]
        "
      >
        <Suspense fallback={<Loading className="mt-10" />}>
          <InboxPageContent
            conversationId={conversationId}
            searchParams={searchParams}
            isModInbox={isModInbox}
          />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
