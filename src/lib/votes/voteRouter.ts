import { os } from "@orpc/server";
import { z } from "zod/v4";
import { db } from "../db";
import { getCurrentUser } from "../users/currentUser";
import { performVote } from "../votes/voteMutations";
import { voteTypeSchema } from "../votes/voteHelpers";
import {
  getVoteableDocument,
  voteableCollectionNameSchema,
} from "../votes/voteableDocument";

export const votesRouter = {
  create: os
    .input(
      z.object({
        collectionName: voteableCollectionNameSchema,
        documentId: z.string(),
        voteType: voteTypeSchema,
        extendedVoteType: z.record(z.string(), z.boolean()).optional(),
      }),
    )
    .handler(
      async ({
        input: { collectionName, documentId, voteType, extendedVoteType },
      }) => {
        const [user, document] = await Promise.all([
          getCurrentUser(),
          getVoteableDocument(collectionName, documentId),
        ]);
        if (!user) {
          throw new Error("Not logged in");
        }
        if (!document) {
          throw new Error("Document not found");
        }
        return await db.transaction((txn) =>
          performVote({
            txn,
            collectionName,
            document,
            user,
            voteType,
            extendedVoteType,
          }),
        );
      },
    ),
};
