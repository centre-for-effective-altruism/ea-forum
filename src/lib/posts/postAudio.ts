import type { PostDisplay } from "./postQueries";
import { postStatuses } from "./postsHelpers";

const TYPE3_DATE_CUTOFF = new Date("2023-05-01");
const TYPE3_KARMA_CUTOFF = 100;

const TYPE3_ALLOWED_POST_IDS = [
  "m65R6pAAvd99BNEZL",
  "Dtr8aHqCQSDhyueFZ",
  "nzB7sphAgJDQGaLrG",
  "6dsrwxHtCgYfJNptp",
  "XCwNigouP88qhhei2",
  "znFAeeKk566bCNMNE",
  "bsE5t6qhGC65fEpzN",
  "FpjQMYQmS3rWewZ83",
  "jk7A3NMdbxp65kcJJ",
  "omoZDu8ScNbot6kXS",
  "hkimyETEo76hJ6NpW",
  "pMsnCieusmYqGW26W",
  "GsjmufaebreiaivF7",
  "LpkXtFXdsRd4rG8Kb",
  "KKzMMPpyv8NyYsJwG",
  "mfAbsrd2ZahmwHq2G",
  "qFfs5zXFGJaoXzb92",
  "zu28unKfTHoxRWpGn",
  "CfcvPBY9hdsenMHCr",
  "JJuEKwRm3oDC3qce7",
  "NFGEgEaLbtyrZ9dX3",
  "pxALB46SEkwNbfiNS",
  "CmGPp5p9RvTLuuzbt",
  "QZy5gJ6JaxGtH7FQq",
  "RQCTw3C59o4XsHvZ4",
  "zdAst6ezi45cChRi6",
  "oRx3LeqFdxN2JTANJ",
  "KfqFLDkoccf8NQsQe",
  "SatDeTkLtHiMrtDjc",
  "i9RJjun327SnT3vW8",
  "P52eSwfmwaN2uwrcM",
  "euBJ4rgfhZBkmBDRT",
  "M2gBGYWEQDnrPt6nb",
  "XHZJ9i7QBtAJZ6byW",
  "sqMgzYpvrdA6Dimfi",
  "u8eif2FkHiaYiAdfH",
  "cZCdfR2nxXQgrzESQ",
  "8RcFQPiza2rvicNqw",
  "2pNAPEQ8av3dQyXBX",
  "yisrgRsi4v3uyhujw",
  "jYT6c8ByLfDpYtwE9",
  "4kqiHGrZh6Rj7EmEW",
  "uLxjjdq6s94X5Yyoc",
  "on34kaRXfQXMFvE6N",
  "ATpxEPwCQWQAFf4XX",
  "pseF3ZmY7uhLtdwss",
  "wicAtfihz2JmPRgez",
  "eyDDjYrG3i3PRGxtc",
  "jSPGFxLmzJTYSZTK3",
  "mCtZF5tbCYW2pRjhi",
  "bDaQsDntmSZPgiSbd",
  "2WS3i7eY4CdLH99eg",
  "2iAwiBQm535ZSYSmo",
  "EbvJRAvwtKAMBn2td",
  "sLcQ4zdAnKZuMPp5u",
  "6fzEkiiSjGn46aMWZ",
  "hRJueS96CMLajeF57",
  "apKTPEcRm6jSFaMya",
  "HX9ZDGwwSxAab46N9",
  "Bd7K4XCg4BGEaSetp",
  "CkikpvdkkLLJHhLXL",
];

/**
 * Whether the post is allowed AI generated audio
 */
export const isPostAllowedType3Audio = (post: PostDisplay): boolean => {
  try {
    return (
      (new Date(post.postedAt) >= TYPE3_DATE_CUTOFF ||
        TYPE3_ALLOWED_POST_IDS.includes(post._id) ||
        post.baseScore > TYPE3_KARMA_CUTOFF ||
        post.forceAllowType3Audio) &&
      !post.draft &&
      !post.authorIsUnreviewed &&
      !post.rejected &&
      !post.podcastEpisodeId &&
      !post.isEvent &&
      !post.question &&
      !post.debate &&
      !post.shortform &&
      post.status === postStatuses.STATUS_APPROVED
    );
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const postHasAudio = (post: PostDisplay) =>
  !!post.podcastEpisodeId || isPostAllowedType3Audio(post);
