import { z } from "zod/v4";

export const filterNonNull = <T>(arr: (T | null | undefined)[]): T[] =>
  arr.filter((x) => x !== null && x !== undefined) as T[];

type Literal<T> = string extends T ? (number extends T ? never : never) : T;

type Tuple<T extends ReadonlyArray<string | number>> =
  Literal<T[number]> extends never ? never : T;

export class TupleSet<T extends ReadonlyArray<string | number>> extends Set<
  string | number
> {
  constructor(knownValues: Tuple<T>) {
    super(knownValues);
  }

  has(value: string | number): value is T[number] {
    return super.has(value);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TupleOf<T extends TupleSet<any>> =
  T extends TupleSet<infer U> ? U : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnionOf<T extends TupleSet<any>> = TupleOf<T>[number];

export const objectKeys = <K extends string | number | symbol, V>(
  obj: Partial<Record<K, V>>,
): K[] => Object.keys(obj) as K[];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JsonArray extends ReadonlyArray<Json> {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JsonRecord extends Record<string, Json> {}
export type Json = boolean | number | string | null | JsonArray | JsonRecord;

export type NextSearchParams = {
  [key: string]: string | string[] | undefined;
};

export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

export const jsonArraySchema = z.array(jsonSchema);

export const jsonRecordSchema = z.record(z.string(), jsonSchema);
