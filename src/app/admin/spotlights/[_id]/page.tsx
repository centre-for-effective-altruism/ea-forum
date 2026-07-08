import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchSpotlightToEdit } from "@/lib/spotlights/spotlightQueries";
import EditSpotlight from "@/components/Spotlights/EditSpotlight";

export const metadata: Metadata = {
  title: "Edit spotlight",
};

export default async function EditSpotlightPage({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  const spotlight = await fetchSpotlightToEdit(_id);
  if (!spotlight) {
    return notFound();
  }
  return (
    <div
      data-component="EditSpotlightPage"
      className="w-[716px] max-w-full mx-auto my-10"
    >
      <EditSpotlight spotlight={spotlight} />
    </div>
  );
}
