"use client";

import { ReactNode, useState } from "react";
import Type from "../Type";
import clsx from "clsx";

type Tab = {
  name: string;
  title: ReactNode;
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
        {tabs.map(({ name, title, content }) =>
          content === null ? null : (
            <Type
              key={name}
              As="button"
              style="sectionTitleLarge"
              onClick={() => setTab(name)}
              className={clsx(
                "cursor-pointer border-b-3 pb-[3px]",
                tab === name ? "border-primary" : "border-transparent",
              )}
            >
              {title}
            </Type>
          ),
        )}
      </div>
      {tabs.find(({ name }) => name === tab)?.content}
    </div>
  );
}
