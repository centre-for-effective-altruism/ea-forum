import type { SearchUser } from "@/lib/search/searchDocuments";
import { userCareerStages } from "@/lib/users/userHelpers";
import { EMPTY_TEXT_PLACEHOLDER } from "./PeopleDirectoryTextCell";
import AcademicCapIcon from "@heroicons/react/24/solid/AcademicCapIcon";
import BriefcaseIcon from "@heroicons/react/24/solid/BriefcaseIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

const icons = {
  School: AcademicCapIcon,
  Work: BriefcaseIcon,
};

export default function PeopleDirectoryCareerStageCell({
  user,
}: Readonly<{
  user: SearchUser;
}>) {
  const stage = user.careerStage?.[0]
    ? userCareerStages.find(({ value }) => value === user.careerStage?.[0])
    : null;
  const Icon = stage?.icon ? icons[stage.icon] : null;
  return (
    <Tooltip title={stage?.label ? <Type>{stage.label}</Type> : null}>
      <Type
        style="directoryCell"
        className="flex items-center gap-[6px] text-gray-600 font-[600]"
        data-component="PeopleDirectoryCareerStageCell"
      >
        {stage ? (
          <>
            {Icon && <Icon className="w-4 min-w-4" />}
            <span>{stage.label}</span>
          </>
        ) : (
          <span>{EMPTY_TEXT_PLACEHOLDER}</span>
        )}
      </Type>
    </Tooltip>
  );
}
