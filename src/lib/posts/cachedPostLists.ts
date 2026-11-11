import "server-only";
import { cacheLife } from "next/cache";
import type { CurrentUser } from "../users/currentUser";
import type { PostsListView } from "./postsHelpers";
import { shortCacheLife } from "../cacheLifetimes";
import {
  fetchFeaturedFrontpagePosts,
  fetchForumFavoritesPostsList,
  fetchFrontpageCuratedPostsList,
  fetchMostRecentlyCuratedPost,
  fetchPostsListById,
  fetchPostsListFromView,
} from "./postLists";

// Post lists include data that's specific to the current user (read statuses,
// votes, etc.), so they're only cached for logged-out users

const fetchLoggedOutPostsListFromView = async (view: PostsListView) => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchPostsListFromView(null, view);
};

const fetchLoggedOutPostsListById = async (postId: string) => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchPostsListById(null, postId);
};

const fetchLoggedOutFrontpageCuratedPostsList = async () => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchFrontpageCuratedPostsList(null);
};

const fetchLoggedOutFeaturedFrontpagePosts = async (limit: number) => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchFeaturedFrontpagePosts({ currentUser: null, limit });
};

const fetchLoggedOutMostRecentlyCuratedPost = async () => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchMostRecentlyCuratedPost(null);
};

const fetchLoggedOutForumFavoritesPostsList = async (limit: number) => {
  "use cache";
  cacheLife(shortCacheLife);
  return fetchForumFavoritesPostsList(null, limit);
};

export const fetchCachedPostsListFromView = (
  currentUserId: string | null,
  view: PostsListView,
) =>
  currentUserId
    ? fetchPostsListFromView(currentUserId, view)
    : fetchLoggedOutPostsListFromView(view);

export const fetchCachedPostsListById = (
  currentUserId: string | null,
  postId: string,
) =>
  currentUserId
    ? fetchPostsListById(currentUserId, postId)
    : fetchLoggedOutPostsListById(postId);

export const fetchCachedFrontpageCuratedPostsList = (
  currentUserId: string | null,
) =>
  currentUserId
    ? fetchFrontpageCuratedPostsList(currentUserId)
    : fetchLoggedOutFrontpageCuratedPostsList();

export const fetchCachedFeaturedFrontpagePosts = (
  currentUser: CurrentUser | null,
  limit: number,
) =>
  currentUser
    ? fetchFeaturedFrontpagePosts({ currentUser, limit })
    : fetchLoggedOutFeaturedFrontpagePosts(limit);

export const fetchCachedMostRecentlyCuratedPost = (
  currentUser: CurrentUser | null,
) =>
  currentUser
    ? fetchMostRecentlyCuratedPost(currentUser)
    : fetchLoggedOutMostRecentlyCuratedPost();

export const fetchCachedForumFavoritesPostsList = (
  currentUserId: string | null,
  limit: number,
) =>
  currentUserId
    ? fetchForumFavoritesPostsList(currentUserId, limit)
    : fetchLoggedOutForumFavoritesPostsList(limit);
