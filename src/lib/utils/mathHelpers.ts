export const getClamper = (min: number, max: number) => (preferred: number) =>
  Math.min(Math.max(min, preferred), max);
