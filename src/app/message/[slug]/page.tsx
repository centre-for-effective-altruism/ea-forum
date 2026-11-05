import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import MessageUserContent from "@/components/Inbox/MessageUserContent";
import Loading from "@/components/Loading";

export const metadata: Metadata = {
  title: "Message user",
  robots: "noindex",
};

export default function MessageUserPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  return (
    <AnalyticsContext pageContext="messageUser">
      <div className="w-[765px] max-w-full mx-auto pt-6 pb-20 px-4">
        <Suspense fallback={<Loading />}>
          <MessageUserContent params={params} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
