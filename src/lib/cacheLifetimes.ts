/**
 * For frequently changing content where serving data that's a minute or two old
 * is fine. This is shorter than the built-in "minutes" profile, which can serve
 * data that's up to an hour old to the first request after a quiet period.
 */
export const shortCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 300,
};
