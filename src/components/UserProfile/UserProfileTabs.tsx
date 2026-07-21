"use client";

import { ReactNode, useState } from "react";
import { formatThousands } from "@/lib/formatHelpers";
import Type from "../Type";
import clsx from "clsx";

type Tab = {
  name: string;
  count?: number;
  content: ReactNode;
};

export default function UserProfileTabs({
  tabs,
}: Readonly<{
  tabs: Tab[];
}>) {
  const [tab, setTab] = useState(tabs[0]?.name ?? "");
  if (!tabs.filter(({ content }) => !!content).length) {
    return null;
  }
  return (
    <div data-component="UserProfileTabs">
      <div
        className="
          flex gap-x-4 gap-y-2 flex-wrap mb-4
          flex-col md:flex-row items-start md:items-center
        "
      >
        {tabs.map(({ name, count, content }) =>
          content === null ? null : (
            <Type
              key={name}
              As="button"
              style="sectionTitleLarge"
              onClick={() => setTab(name)}
              className={clsx(
                "cursor-pointer border-b-3 pb-[3px] flex items-baseline gap-1.5",
                tab === name ? "border-primary" : "border-transparent",
              )}
            >
              {name}
              {typeof count === "number" && (
                <Type style="bodyMedium" className="text-gray-600">
                  {formatThousands(count)}
                </Type>
              )}
            </Type>
          ),
        )}
      </div>
      {tabs.find(({ name }) => name === tab)?.content}
    </div>
  );
}
