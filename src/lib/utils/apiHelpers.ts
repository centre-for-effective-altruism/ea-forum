import { ApiError } from "../requestHandler";

/** Helper for parsing positive ints received via URL params */
export const parsePositiveInt = (
  value: string | null,
  defaultValue: number,
  errorMessage: string,
) => {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ApiError(400, errorMessage);
  }
  return parsed;
};
