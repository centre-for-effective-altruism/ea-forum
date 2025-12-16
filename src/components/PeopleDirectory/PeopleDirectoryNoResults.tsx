import { usePeopleDirectory } from "./usePeopleDirectory";
import Button from "../Button";
import Type from "../Type";

export default function PeopleDirectoryNoResults() {
  const { clearSearch } = usePeopleDirectory();
  return (
    <div
      data-component="PeopleDirectoryNoResults"
      className="mt-10 flex flex-col items-center gap-3 text-gray-600"
    >
      <Type className="text-[20px] font-[600]">No people found</Type>
      <Type>Try using different keywords or change your filters</Type>
      <Button onClick={clearSearch} variant="greyOutlined" className="mt-3">
        Clear search
      </Button>
    </div>
  );
}
