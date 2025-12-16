import { AnalyticsContext } from "@/lib/analyticsEvents";
import Type from "@/components/Type";
import { PeopleDirectoryProvider } from "@/components/PeopleDirectory/usePeopleDirectory";
import PeopleDirectoryMainSearch from "@/components/PeopleDirectory/PeopleDirectoryMainSearch";
import PeopleDirectoryFilters from "@/components/PeopleDirectory/PeopleDirectoryFilters";
import PeopleDirectoryResults from "@/components/PeopleDirectory/PeopleDirectoryResults";
import "@/components/PeopleDirectory/people-directory.css";

export default function PeopleDirectoryPage() {
  return (
    <AnalyticsContext pageContext="peopleDirectory">
      <div className="px-10 py-5 flex flex-col gap-4">
        <Type As="h1" style="sectionTitleLarge" className="text-[32px] mt-2 mb-6">
          People Directory
        </Type>
        <PeopleDirectoryProvider>
          <PeopleDirectoryMainSearch />
          <PeopleDirectoryFilters />
          <PeopleDirectoryResults />
        </PeopleDirectoryProvider>
      </div>
    </AnalyticsContext>
  );
}
