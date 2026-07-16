"use client";

import { FC, ReactNode, useState } from "react";
import PostBody from "../ContentStyles/PostBody";
import Type from "../Type";
import clsx from "clsx";
import { userProgramParticipation } from "@/lib/users/userHelpers";
import { filterNonNull } from "@/lib/typeHelpers";

const Tab: FC<{
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}> = ({ active, onClick, children }) => (
  <Type
    As="button"
    style="sectionTitleLarge"
    onClick={onClick}
    className={clsx(
      "cursor-pointer border-b-3 pb-[3px]",
      active ? "border-primary" : "border-transparent",
    )}
  >
    {children}
  </Type>
);

export default function UserProfileBiographyTabs({
  biographyHtml,
  programParticipation,
}: Readonly<{
  biographyHtml: string | null;
  programParticipation: string[] | null;
}>) {
  const participationStrings = filterNonNull(
    programParticipation?.map(
      (p) => userProgramParticipation.find(({ value }) => p === value)?.label,
    ) ?? [],
  );

  const hasBio = !!biographyHtml;
  const hasParticipation = !!participationStrings?.length;

  const [tab, setTab] = useState(hasBio ? "bio" : "participation");

  return (
    <div data-component="UserProfileBiographyTabs">
      <div className="flex items-center gap-4 mb-4">
        {hasBio && (
          <Tab active={tab === "bio"} onClick={() => setTab("bio")}>
            Bio
          </Tab>
        )}
        {hasParticipation && (
          <Tab
            active={tab === "participation"}
            onClick={() => setTab("participation")}
          >
            Participation{" "}
            <span className="text-gray-600">{participationStrings.length}</span>
          </Tab>
        )}
      </div>
      {biographyHtml && tab === "bio" && <PostBody html={biographyHtml} />}
      {programParticipation && tab === "participation" && (
        <ul className="list-disc ml-5">
          {participationStrings.map((participation) => (
            <Type key={participation} style="bodySerif" As="li">
              {participation}
            </Type>
          ))}
        </ul>
      )}
    </div>
  );
}
