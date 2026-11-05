import type { Metadata } from "next";
import {
  getSequenceEventMetadata,
  scalingSeriesEvent,
} from "@/lib/sequences/sequenceEvents";
import SequenceEventPage from "@/components/SequenceEvents/SequenceEventPage";

export function generateMetadata(): Metadata {
  return getSequenceEventMetadata(scalingSeriesEvent);
}

export default function ScalingSeriesPage() {
  return <SequenceEventPage event={scalingSeriesEvent} />;
}
