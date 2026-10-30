import RebuildSearchIndexes from "@/components/Admin/RebuildSearchIndexes";

export default function SearchIndexesPage() {
  return (
    <div
      className="
        max-w-full w-160 mx-auto my-20 bg-surface-floating rounded px-4 py-6
      "
    >
      <RebuildSearchIndexes />
    </div>
  );
}
