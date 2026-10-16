"use client";

import { ReactNode, useState } from "react";
import UserProfileHeading from "./UserProfileHeading";

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
            <button
              key={name}
              onClick={() => setTab(name)}
              className="cursor-pointer"
            >
              <UserProfileHeading
                count={count}
                className={tab !== name ? "!border-transparent" : undefined}
              >
                {name}
              </UserProfileHeading>
            </button>
          ),
        )}
      </div>
      {tabs.find(({ name }) => name === tab)?.content}
    </div>
  );
}
