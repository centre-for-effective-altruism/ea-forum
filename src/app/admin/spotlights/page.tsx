import { fetchAllSpotlightsForAdmin } from "@/lib/spotlights/spotlightQueries";
import SpotlightsAdmin from "@/components/Admin/Spotlights/SpotlightsAdmin";

export default async function AdminSpotlightsPage() {
  const spotlights = await fetchAllSpotlightsForAdmin();
  return <SpotlightsAdmin initialSpotlights={spotlights} />;
}
