import type { Metadata } from "next";
import {
  getSequenceEventMetadata,
  inDevelopmentEvent,
} from "@/lib/sequences/sequenceEvents";
import SequenceEventPage from "@/components/SequenceEvents/SequenceEventPage";

export function generateMetadata(): Metadata {
  return getSequenceEventMetadata(inDevelopmentEvent);
}

export default function InDevelopmentPage() {
  return <SequenceEventPage event={inDevelopmentEvent} />;
}
