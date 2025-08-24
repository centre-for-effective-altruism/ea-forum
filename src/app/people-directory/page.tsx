import { AnalyticsContext } from "@/lib/analyticsEvents";
import Type from "@/components/Type";
import { PeopleDirectoryProvider } from "@/components/PeopleDirectory/usePeopleDirectory";
import PeopleDirectoryMainSearch from "@/components/PeopleDirectory/PeopleDirectoryMainSearch";
import PeopleDirectoryFilters from "@/components/PeopleDirectory/PeopleDirectoryFilters";
import PeopleDirectoryResults from "@/components/PeopleDirectory/PeopleDirectoryResults";

export default function PeopleDirectoryPage() {
  return (
    <AnalyticsContext pageContext="peopleDirectory">
      <div>
        <Type As="h1" style="sectionTitleLarge" className="text-[32px]">
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
