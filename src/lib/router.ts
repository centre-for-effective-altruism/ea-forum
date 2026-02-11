import "server-only";
import { vote } from "./votes/voteRouter";

export const router = {
  vote,
};

export type Router = typeof router;
