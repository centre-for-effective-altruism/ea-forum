"use client";

import { createRoot } from "react-dom/client";
import type {
  SearchPost,
  SearchTag,
  SearchUser,
} from "@/lib/search/searchDocuments";
import { getSiteUrl } from "@/lib/routeHelpers";
import { getSearchClient } from "@/lib/search/searchClient";
import { filterNonNull } from "@/lib/typeHelpers";
import { userGetDisplayName } from "../users/userHelpers";
import { getSearchIndexName } from "../search/elastic/elasticIndexes";
import UserMentionHit from "@/components/Search/UserMentionHit";
import PostMentionHit from "@/components/Search/PostMentionHit";
import TagMentionHit from "@/components/Search/TagMentionHit";

export const userMentionQuery = "mention";
export const userMentionValue = "user";
export const userMentionQueryString = `${userMentionQuery}=${userMentionValue}`;
const MARKER = "@";

const formatSearchHit = (hit: SearchUser | SearchPost | SearchTag) => {
  switch (hit._index) {
    case "users":
      const displayName = MARKER + userGetDisplayName(hit);
      return {
        type: "Users",
        id: displayName,
        // Query string is intended for later use in detecting the ping
        link: `${getSiteUrl()}users/${hit.slug}?${userMentionQueryString}`,
        text: displayName,
        hit,
      };
    case "posts":
      return {
        type: "Posts",
        // What gets displayed in the dropdown results, must have postMarker
        id: MARKER + hit.title,
        link: `${getSiteUrl()}posts/${hit._id}/${hit.slug}`,
        text: hit.title,
        hit,
      };
    case "tags":
      return {
        type: "Tags",
        id: MARKER + hit.name,
        link: `${getSiteUrl()}topics/${hit.slug}`,
        text: hit.name,
        hit,
      };
    default:
      return null;
  }
};

const collectionNames = ["Posts", "Users", "Tags"] as const;

const fetchMentionableSuggestions = async (searchString: string) => {
  const indexName = collectionNames.map(getSearchIndexName).join(",");
  const searchClient = getSearchClient();
  const response = await searchClient.search<SearchUser | SearchPost | SearchTag>([
    {
      indexName,
      query: searchString,
      params: {
        query: searchString,
        hitsPerPage: 7,
      },
    },
  ]);
  const hits = response?.results?.[0]?.hits;
  return Array.isArray(hits) ? filterNonNull(hits.map(formatSearchHit)) : [];
};

type MentionUser = {
  type: "Users";
  hit: SearchUser;
};

type MentionPost = {
  type: "Posts";
  hit: SearchPost;
};

type MentionTag = {
  type: "Tags";
  hit: SearchTag;
};

type MentionItem = (MentionUser | MentionPost | MentionTag) & {
  id: string;
  text: string;
  link: string;
};

const itemRenderer = (item: MentionItem) => {
  const itemElement = document.createElement("button");
  itemElement.classList.add("ck-mention-item", "ck-reset_all-excluded");
  itemElement.style.cursor = "pointer";
  const root = createRoot(itemElement);
  switch (item.type) {
    case "Users":
      root.render(<UserMentionHit hit={item.hit} />);
      break;
    case "Posts":
      root.render(<PostMentionHit hit={item.hit} />);
      break;
    case "Tags":
      root.render(<TagMentionHit hit={item.hit} />);
      break;
  }
  return itemElement;
};

export const mentionPluginConfiguration = {
  feeds: [
    {
      marker: MARKER,
      feed: fetchMentionableSuggestions,
      minimumCharacters: 1,
      itemRenderer,
    },
  ],
};
