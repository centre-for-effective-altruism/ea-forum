import { TupleSet, UnionOf } from "@/lib/typeHelpers";

export const searchIndexedCollectionNames = [
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

export const getSearchIndexName = (
  collectionName: SearchIndexCollectionName,
): string => {
  const prefix = process.env.NEXT_PUBLIC_SEARCH_INDEX_PREFIX || "";
  switch (collectionName) {
    case "Comments":
      return prefix + "comments";
    case "Posts":
      return prefix + "posts";
    case "Users":
      return prefix + "users";
    case "Sequences":
      return prefix + "sequences";
    case "Tags":
      return prefix + "tags";
  }
};

export const collectionIsSearchIndexed = (
  collectionName: string,
): collectionName is SearchIndexCollectionName =>
  searchIndexedCollectionNames.includes(collectionName as SearchIndexCollectionName);
