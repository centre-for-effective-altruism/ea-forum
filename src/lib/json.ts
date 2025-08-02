export interface JsonArray extends ReadonlyArray<Json> {}
export interface JsonRecord extends Record<string, Json> {}
export type Json = boolean | number | string | null | JsonArray | JsonRecord
