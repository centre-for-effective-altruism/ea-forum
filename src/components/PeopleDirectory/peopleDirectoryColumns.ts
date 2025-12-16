import type { ComponentProps } from "react";
import { formatShortDate } from "@/lib/timeUtils";
import PeopleDirectoryUserCell from "./PeopleDirectoryUserCell";
import PeopleDirectoryTextCell from "./PeopleDirectoryTextCell";
import PeopleDirectoryDateCell from "./PeopleDirectoryDateCell";
import PeopleDirectoryNumberCell from "./PeopleDirectoryNumberCell";
import PeopleDirectorySocialMediaCell from "./PeopleDirectorySocialMediaCell";
import PeopleDirectoryCareerStageCell from "./PeopleDirectoryCareerStageCell";
import PeopleDirectorySkeletonUserCell from "./PeopleDirectorySkeletonUserCell";
import PeopleDirectorySkeletonTextCell from "./PeopleDirectorySkeletonTextCell";
import PeopleDirectoryTopicsCell from "./PeopleDirectoryTopicsCell";
import PeopleDirectoryCommentCountCell from "./PeopleDirectoryCommentCountCell";
import PeopleDirectoryPostsCell from "./PeopleDirectoryPostsCell";

export const cellComponentsByName = {
  PeopleDirectoryUserCell,
  PeopleDirectoryTextCell,
  PeopleDirectoryDateCell,
  PeopleDirectoryNumberCell,
  PeopleDirectorySocialMediaCell,
  PeopleDirectoryCareerStageCell,
  PeopleDirectorySkeletonUserCell,
  PeopleDirectorySkeletonTextCell,
  PeopleDirectoryTopicsCell,
  PeopleDirectoryCommentCountCell,
  PeopleDirectoryPostsCell,
} as const;

type CellComponentName = keyof typeof cellComponentsByName;

type CellComponentProps<T extends CellComponentName> = ComponentProps<
  (typeof cellComponentsByName)[T]
>;

type PeopleDirectoryColumnState =
  | {
      hideable: false;
    }
  | {
      hideable: true;
      hidden: boolean;
    };

export type PeopleDirectoryColumn<
  T extends CellComponentName = CellComponentName,
  S extends CellComponentName = CellComponentName,
> = {
  label: string;
  shortLabel?: string;
  sortField?: string;
  defaultSort?: "asc" | "desc";
  columnWidth?: string;
  componentName: T;
  props?: Omit<CellComponentProps<T>, "user" | "ref">;
  skeletonComponentName?: S;
  skeletonProps?: Omit<
    ComponentProps<(typeof cellComponentsByName)[S]>,
    "user" | "ref"
  >;
} & PeopleDirectoryColumnState;

export const peopleDirectoryColumns: PeopleDirectoryColumn<CellComponentName>[] = [
  {
    label: "Name",
    sortField: "displayName.sort",
    columnWidth: "200px",
    componentName: "PeopleDirectoryUserCell",
    skeletonComponentName: "PeopleDirectorySkeletonUserCell",
    hideable: false,
  },
  {
    label: "Role",
    sortField: "jobTitle.sort",
    componentName: "PeopleDirectoryTextCell",
    props: {
      fieldName: "jobTitle",
    },
    hideable: true,
    hidden: false,
  },
  {
    label: "Organization",
    sortField: "organization.sort",
    componentName: "PeopleDirectoryTextCell",
    props: {
      fieldName: "organization",
    },
    hideable: true,
    hidden: false,
  },
  {
    label: "Bio",
    columnWidth: "1.5fr",
    componentName: "PeopleDirectoryTextCell",
    props: {
      fieldName: "bio",
    },
    skeletonComponentName: "PeopleDirectorySkeletonTextCell",
    skeletonProps: {
      lines: 2,
    },
    hideable: true,
    hidden: false,
  },
  {
    label: "Social media",
    columnWidth: "140px",
    componentName: "PeopleDirectorySocialMediaCell",
    hideable: true,
    hidden: false,
  },
  {
    label: "Career stage",
    columnWidth: "175px",
    componentName: "PeopleDirectoryCareerStageCell",
    hideable: true,
    hidden: false,
  },
  {
    label: "Topic interests",
    columnWidth: "1.5fr",
    componentName: "PeopleDirectoryTopicsCell",
    hideable: true,
    hidden: false,
  },
  {
    label: "Karma",
    sortField: "karma",
    defaultSort: "desc",
    columnWidth: "80px",
    componentName: "PeopleDirectoryNumberCell",
    props: {
      fieldName: "karma",
    },
    hideable: true,
    hidden: false,
  },
  {
    label: "Comments",
    sortField: "commentCount",
    defaultSort: "desc",
    columnWidth: "auto",
    componentName: "PeopleDirectoryCommentCountCell",
    hideable: true,
    hidden: false,
  },
  {
    label: "Top post",
    columnWidth: "200px",
    componentName: "PeopleDirectoryPostsCell",
    hideable: true,
    hidden: false,
  },
  {
    label: "Location",
    sortField: "mapLocationAddress.sort",
    componentName: "PeopleDirectoryTextCell",
    props: {
      fieldName: "mapLocationAddress",
    },
    hideable: true,
    hidden: true,
  },
  {
    label: "Profile last updated",
    shortLabel: "Profile updated",
    sortField: "profileUpdatedAt",
    defaultSort: "desc",
    columnWidth: "120px",
    componentName: "PeopleDirectoryDateCell",
    props: {
      fieldName: "profileUpdatedAt",
      formater: formatShortDate,
    },
    hideable: true,
    hidden: true,
  },
];
