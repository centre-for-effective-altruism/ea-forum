import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchSequenceEditPage } from "@/lib/sequences/sequenceQueries";
import SequenceEditPageContent from "@/components/SequenceEdit/SequenceEditPageContent";
import Loading from "@/components/Loading";

type SequenceEditPageProps = {
  params: Promise<{ sequenceId: string }>;
};

export async function generateMetadata({
  params,
}: SequenceEditPageProps): Promise<Metadata> {
  const [currentUser, { sequenceId }] = await Promise.all([
    getCurrentUser(),
    params,
  ]);
  const data = await fetchSequenceEditPage(currentUser, sequenceId);
  return {
    title: data ? `Edit "${data.sequence.title}"` : "Edit sequence",
    robots: "noindex",
  };
}

export default function SequenceEditPage({ params }: SequenceEditPageProps) {
  return (
    <AnalyticsContext pageContext="sequenceEditPage">
      <div
        className="
          w-[765px] max-w-full mx-auto pt-6 pb-20 px-4 flex flex-col gap-6
        "
      >
        <Suspense fallback={<Loading className="py-8" />}>
          <SequenceEditPageContent params={params} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
