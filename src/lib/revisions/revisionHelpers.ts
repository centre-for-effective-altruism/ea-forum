import type { EditorContents } from "../ckeditor/editorHelpers";
import type { Revision } from "../schema";
import type { Json } from "../typeHelpers";

export type RevisionUpdateType = "major" | "minor" | "patch" | "initial";

/**
 * Given a revision from the database, return just the fields to be denormalized
 * into other tables.
 */
export const denormalizeRevision = (revision: Revision): Json => {
  return {
    originalContents: revision.originalContents as EditorContents,
    html: revision.html,
    version: revision.version,
    userId: revision.userId,
    editedAt: revision.editedAt,
    wordCount: revision.wordCount,
    updateType: revision.updateType,
  };
};

// This currently only supports our limited subset of semVer
export const parseSemver = (semver: string) =>
  semver.split(".").map((n) => parseInt(n, 10));

export const extractVersionsFromSemver = (semver: string | null) => {
  const [major, minor, patch] = parseSemver(semver || "1.0.0");
  return { major, minor, patch };
};

export const getNextVersionAfterSemver = (
  previousRevision: string,
  updateType: RevisionUpdateType | null,
  isDraft: boolean,
) => {
  const { major, minor, patch } = extractVersionsFromSemver(previousRevision);
  switch (updateType) {
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "major":
      return `${major + 1}.0.0`;
    case "initial":
      return isDraft ? "0.1.0" : "1.0.0";
    default:
      throw new Error("Invalid updateType");
  }
};

export const getNextVersion = (
  previousRevision: Revision | null,
  updateType: RevisionUpdateType = "minor",
  isDraft: boolean,
) => {
  const version = previousRevision?.version || "1.0.0";
  return getNextVersionAfterSemver(version, updateType, isDraft);
};
