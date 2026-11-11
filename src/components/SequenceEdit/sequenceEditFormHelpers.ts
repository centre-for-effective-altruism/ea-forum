export const numberToInput = (value: number | null) =>
  value === null ? "" : String(value);

export const parseOptionalNumber = (label: string, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number`);
  }
  return parsed;
};

export const emptyToNull = (value: string) => value.trim() || null;

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
