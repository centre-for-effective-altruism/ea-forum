import { useObserver } from "@/lib/hooks/useObserver";
import { usePeopleDirectory } from "./usePeopleDirectory";
import HorizScrollBlock from "../HorizScrollBlock";
import PeopleDirectoryNoResults from "./PeopleDirectoryNoResults";
import PeopleDirectoryHeading from "./PeopleDirectoryHeading";
import PeopleDirectoryResultRow from "./PeopleDirectoryResultRow";

export default function PeopleDirectoryResultsList() {
  const { results, resultsLoading, columns, loadMore } = usePeopleDirectory();
  const desktopLoadMoreRef = useObserver<HTMLDivElement>({ onEnter: loadMore });
  // TODO: Mobile card UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mobileLoadMoreRef = useObserver<HTMLDivElement>({ onEnter: loadMore });

  let gridTemplateColumns = "";
  for (const column of columns) {
    if (!column.hideable || !column.hidden) {
      gridTemplateColumns += ` ${column.columnWidth ?? " 1fr"}`;
    }
  }

  if (results.length < 1 && !resultsLoading) {
    return <PeopleDirectoryNoResults />;
  }

  return (
    <div data-component="PeopleDirectoryResultsList">
      <HorizScrollBlock
        className="hidden md:block"
        contentsClassName="bg-gray-50 border border-gray-300 rounded m-0! py-3"
      >
        <div
          className={`
            flex min-w-full w-min
            after:block after:h-full after: after:content-[''] after:min-w-6
          `}
        >
          <div
            className="grid w-full text-gray-1000"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column) =>
              !column.hideable || !column.hidden ? (
                <PeopleDirectoryHeading key={column.label} column={column} />
              ) : null,
            )}
            {results.map((result) => (
              <PeopleDirectoryResultRow key={result._id} result={result} />
            ))}
            {resultsLoading &&
              Array.from(Array(10).keys()).map((i) => (
                <PeopleDirectoryResultRow key={i} />
              ))}
            {results.length > 0 && (
              <div className="col-span-full" ref={desktopLoadMoreRef} />
            )}
          </div>
        </div>
      </HorizScrollBlock>
      <div className="md:hidden"></div>
    </div>
  );
}
