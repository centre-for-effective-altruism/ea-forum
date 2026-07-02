import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchAllSpotlightsForAdmin } from "@/lib/spotlights/spotlightQueries";
import SpotlightsAdmin from "@/components/Admin/Spotlights/SpotlightsAdmin";

export default async function AdminSpotlightsPage() {
  const currentUser = await getCurrentUser();
  const spotlights = await fetchAllSpotlightsForAdmin(currentUser);
  return <SpotlightsAdmin initialSpotlights={spotlights} />;
}
