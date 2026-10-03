import type { ReactNode } from "react";
import Type from "@/components/Type";

export default function ModerationTable({
  headers,
  rows,
  emptyText = "No results",
  headerClassName = "bg-primary text-always-white",
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyText?: string;
  headerClassName?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-0 text-gray-1000">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse">
          <thead className={headerClassName}>
            <tr>
              {headers.map((header) => (
                <Type
                  key={header}
                  style="bodyMedium"
                  As="th"
                  className="py-2 px-3 text-left"
                >
                  {header}
                </Type>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-4">
                  <Type style="bodySmall" className="text-gray-600">
                    {emptyText}
                  </Type>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className="border-t border-gray-200 odd:bg-gray-50"
                >
                  {row.map((cell, cellIndex) => (
                    <Type
                      key={`cell-${rowIndex}-${cellIndex}`}
                      style="bodySmall"
                      As="td"
                      className="px-3 py-2 align-top text-gray-1000"
                    >
                      {cell}
                    </Type>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
