import type { Metadata } from "next";
import {
  getSequenceEventMetadata,
  marginalFundingEvent,
} from "@/lib/sequences/sequenceEvents";
import SequenceEventPage from "@/components/SequenceEvents/SequenceEventPage";

export function generateMetadata(): Metadata {
  return getSequenceEventMetadata(marginalFundingEvent);
}

export default function MarginalFundingPage() {
  return <SequenceEventPage event={marginalFundingEvent} />;
}
