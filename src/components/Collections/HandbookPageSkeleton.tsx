import HandbookColumn from "./HandbookColumn";

export default function HandbookPageSkeleton() {
  return (
    <div
      data-component="HandbookPageSkeleton"
      className="px-4 sm:px-2 pt-8 sm:pt-12 md:pt-16 pb-16"
    >
      <HandbookColumn
        left={
          <div className="sticky left-0 top-18 pl-8 pt-5 flex flex-col gap-3">
            <div className="h-5 w-44 bg-gray-200 rounded" />
            <div className="h-px w-full bg-gray-300" />
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={
                  i === 0
                    ? "h-4 w-40 bg-gray-200 rounded ml-4"
                    : "h-4 w-36 bg-gray-200 rounded ml-8"
                }
              />
            ))}
          </div>
        }
      >
        <div className="flex flex-col gap-8">
          <div className="rounded bg-gray-0 p-6 sm:p-9 flex flex-col gap-6">
            <div className="h-[52px] w-96 max-w-full bg-gray-300 rounded" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
            </div>
            <div className="h-9 w-32 bg-gray-300 rounded" />
          </div>
          <div className="rounded bg-gray-0 p-6 sm:p-9 flex flex-col gap-4">
            <div className="h-[30px] w-64 max-w-full bg-gray-300 rounded" />
            <div className="h-5 w-80 max-w-full bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="flex flex-col gap-6 mt-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="
                    h-[280px] rounded border-1 border-gray-200
                    flex flex-col sm:flex-row overflow-hidden
                  "
                >
                  <div className="sm:w-[45%] flex flex-col">
                    <div className="h-[125px] bg-gray-200" />
                    <div className="p-4 flex flex-col gap-2">
                      <div className="h-6 w-3/4 bg-gray-300 rounded" />
                      <div className="h-4 w-full bg-gray-200 rounded" />
                      <div className="h-4 w-2/3 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col gap-3">
                    {Array.from({ length: 5 }, (_, j) => (
                      <div key={j} className="h-4 w-5/6 bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </HandbookColumn>
    </div>
  );
}
