import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchSequenceEvent } from "@/lib/sequences/sequenceEventQueries";
import {
  scalingSeriesEvent,
  sequenceEventMetadata,
} from "@/lib/sequences/sequenceEvents";
import SequenceEventPage from "@/components/SequenceEventPage/SequenceEventPage";

export const metadata: Metadata = sequenceEventMetadata(scalingSeriesEvent);

export default async function ScalingSeriesPage() {
  const currentUser = await getCurrentUser();
  const data = await fetchSequenceEvent({
    currentUser,
    config: scalingSeriesEvent,
  });
  if (!data) {
    notFound();
  }
  return <SequenceEventPage config={scalingSeriesEvent} {...data} />;
}
