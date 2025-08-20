import type { ICurrentUser } from "./userQueries.schemas";

export const userGetProfileUrl = ({ slug }: Pick<ICurrentUser, "slug">) =>
  `/users/${slug}`;

export const userGetStatsUrl = ({ slug }: Pick<ICurrentUser, "slug">) =>
  `/users/${slug}/stats`;
