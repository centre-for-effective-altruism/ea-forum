import { filterNonNull } from "../typeHelpers";
import { CoreTag } from "./tagQueries";

/**
 * The order in which the topics are displayed in the homepage tag bar is
 * slightly different from their default ordering
 */
const homePageTagBarOrder = [
  "z8qFsGt5iXyZiLbjN", // Opportunities
  "sWcuTyTB5dP3nas2t", // Global health
  "QdH9f8TC6G8oGYdgt", // Animal welfare
  "oNiQsBHA3i837sySD", // AI safety
  "ZCihBFp5P64JCvQY6", // Community
  "H43gvLzBCacxxamPe", // Biosecurity & pandemics
  "ee66CtAMYurQreWBH", // Existential risk
  "4eyeLKC64Yvznzt6Z", // Philosophy
  "EHLmbEmJ2Qd5WfwTb", // Building effective altruism
  "of9xBvR3wpbp6qsZC", // Policy
  "psBzwdY8ipfCeExJ7", // Cause prioritization
  "L6NqHZkLc4xZ7YtDr", // Effective giving
  "4CH9vsvzyk4mSKwyZ", // Career choice
  "aJnrnnobcBNWRsfAw", // Forecasting & estimation
];

export const sortedHomePageTags = (tags: CoreTag[]) =>
  filterNonNull(
    homePageTagBarOrder.map((topicId) => tags.find((t) => t._id === topicId)),
  );
