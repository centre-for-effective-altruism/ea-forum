// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JsonArray extends ReadonlyArray<Json> {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JsonRecord extends Record<string, Json> {}
export type Json = boolean | number | string | null | JsonArray | JsonRecord;
