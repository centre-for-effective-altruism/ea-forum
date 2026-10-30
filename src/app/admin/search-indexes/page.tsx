import SearchIndexActions from "@/components/Admin/SearchIndexActions";
import SearchIndexStatuses from "@/components/Admin/SearchIndexStatuses";

export default function SearchIndexesPage() {
  return (
    <div className="max-w-full w-160 mx-auto my-20 flex flex-col gap-6">
      <div className="bg-surface-floating rounded px-4 py-6">
        <SearchIndexActions />
      </div>
      <div className="bg-surface-floating rounded px-4 py-6">
        <SearchIndexStatuses />
      </div>
    </div>
  );
}
