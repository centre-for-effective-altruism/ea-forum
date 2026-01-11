import { getSiteUrl } from "../routeHelpers";

export const sequenceGetPageUrl = ({
  sequence,
  isAbsolute,
}: {
  sequence: { _id: string };
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  return `${prefix}/s/${sequence._id}`;
};
