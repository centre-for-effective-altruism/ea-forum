import { getSiteUrl } from "../routeHelpers";
import { SequencePost } from "../sequences/sequenceQueries";
import type { CollectionBase } from "./collectionQueries";

export const collectionGetPageUrl = ({
  collection,
  isAbsolute,
}: {
  collection: CollectionBase;
  isAbsolute?: boolean;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  return `${prefix}/${collection.slug}`;
};

export const collectionReadPostCount = (posts: SequencePost[]) =>
  posts.reduce((total, post) => total + (post.readStatus?.[0]?.isRead ? 1 : 0), 0);

export const getCollectionCardDetails = ({
  _id,
  title,
  user,
  gridImageId,
}: CollectionBase) => {
  // Add special case short names for the EA handbook
  if (_id === "MobebwWs2o86cS9Rd") {
    return {
      title: "The EA Handbook",
      author: user
        ? {
            ...user,
            displayName: "CEA",
          }
        : null,
      imageId: "268969264-1881a4b1-01d3-4d79-9481-e6b3eae202fc",
    };
  }
  return {
    title,
    author: user,
    imageId: gridImageId || "Banner/yeldubyolqpl3vqqy0m6.jpg",
  };
};
