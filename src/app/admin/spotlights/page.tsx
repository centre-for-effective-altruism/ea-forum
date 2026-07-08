import type { Metadata } from "next";
import {
  fetchAllSpotlights,
  SpotlightBase,
} from "@/lib/spotlights/spotlightQueries";
import NewSpotlightButton from "@/components/Spotlights/NewSpotlightButton";
import EditableSpotlight from "@/components/Spotlights/EditableSpotlight";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "Spotlights",
};

export default async function AdminSpotlightsPage() {
  const spotlights = await fetchAllSpotlights();

  const active: SpotlightBase[] = [];
  const upcoming: SpotlightBase[] = [];
  const previous: SpotlightBase[] = [];
  const now = new Date();
  for (const spotlight of spotlights) {
    const startAt = spotlight.startAt ? new Date(spotlight.startAt) : null;
    const endAt = spotlight.endAt ? new Date(spotlight.endAt) : null;
    if (startAt && endAt && new Date(startAt) <= now && new Date(endAt) > now) {
      active.push(spotlight);
    } else if (endAt && new Date(endAt) < now) {
      previous.push(spotlight);
    } else {
      upcoming.push(spotlight);
    }
  }

  return (
    <div
      data-component="AdminSpotlightsPage"
      className="w-[732px] max-w-full mx-auto my-10 px-2 flex flex-col gap-10"
    >
      <NewSpotlightButton />
      <section className="flex flex-col gap-6">
        <Type style="sectionTitleLarge">Active spotlights</Type>
        {active.map((spotlight) => (
          <EditableSpotlight key={spotlight._id} spotlight={spotlight} />
        ))}
        {active.length === 0 && <Type>No active spotlights</Type>}
      </section>
      <section className="flex flex-col gap-6">
        <Type style="sectionTitleLarge">Upcoming spotlights</Type>
        {upcoming.map((spotlight) => (
          <EditableSpotlight key={spotlight._id} spotlight={spotlight} />
        ))}
        {upcoming.length === 0 && <Type>No upcoming spotlights</Type>}
      </section>
      <section className="flex flex-col gap-6">
        <Type style="sectionTitleLarge">Previous spotlights</Type>
        {previous.map((spotlight) => (
          <EditableSpotlight key={spotlight._id} spotlight={spotlight} />
        ))}
        {previous.length === 0 && <Type>No previous spotlights</Type>}
      </section>
    </div>
  );
}
