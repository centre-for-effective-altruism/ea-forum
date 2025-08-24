import { TupleSet, UnionOf } from "@/lib/typeHelpers";

const searchIndexedCollectionNames = [
  "Comments",
  "Posts",
  "Users",
  "Sequences",
  "Tags",
] as const;

export const searchIndexedCollectionNamesSet = new TupleSet(
  searchIndexedCollectionNames,
);

export type SearchIndexCollectionName = UnionOf<
  typeof searchIndexedCollectionNamesSet
>;
