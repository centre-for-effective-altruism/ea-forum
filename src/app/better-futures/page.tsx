import type { Metadata } from "next";
import {
  getSequenceEventMetadata,
  betterFuturesEvent,
} from "@/lib/sequences/sequenceEvents";
import SequenceEventPage from "@/components/SequenceEvents/SequenceEventPage";

export function generateMetadata(): Metadata {
  return getSequenceEventMetadata(betterFuturesEvent);
}

export default function BetterFuturesPage() {
  return <SequenceEventPage event={betterFuturesEvent} />;
}
