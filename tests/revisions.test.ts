import { expect, suite, test } from "vitest";
import { createTestUser } from "./testHelpers";
import { createRevision } from "@/lib/revisions/revisionMutations";
import { randomId } from "@/lib/utils/random";
import { db } from "@/lib/db";
import type { EditorContents, EditorData } from "@/lib/ckeditor/editorHelpers";
import type { ChangeMetrics } from "@/lib/revisions/htmlToChangeMetrics";
import {
  extractVersionsFromSemver,
  getNextVersionAfterSemver,
  parseSemver,
  RevisionUpdateType,
} from "@/lib/revisions/revisionHelpers";

suite("Revisions", () => {
  test("Can create a revision", async () => {
    const user = await createTestUser();
    const editorData: EditorData = {
      originalContents: {
        type: "ckEditorMarkup",
        data: "<p>Hello world</p>",
      },
      updateType: "initial",
      commitMessage: "",
    };
    const documentId = randomId();
    const revision = await createRevision(db, user, editorData, {
      documentId,
      collectionName: "Comments",
      fieldName: "contents",
    });
    expect(revision.userId).toBe(user._id);
    expect(revision.documentId).toBe(documentId);
    expect(revision.collectionName).toBe("Comments");
    expect(revision.fieldName).toBe("contents");
    expect(revision.createdAt).toBeTruthy();
    expect(revision.editedAt).toBeTruthy();
    expect(revision.updateType).toBe("initial");
    expect(revision.wordCount).toBe(2);
    const changeMetrics = revision.changeMetrics as ChangeMetrics;
    expect(changeMetrics.added).toBe(11);
    expect(changeMetrics.removed).toBe(0);
    const originalContents = revision.originalContents as EditorContents;
    expect(originalContents?.type).toBe("ckEditorMarkup");
    expect(originalContents?.data).toBe("<p>Hello world</p>");
  });
  suite("parseSemver", () => {
    test("should parse a standard semver string", () => {
      expect(parseSemver("1.2.3")).toEqual([1, 2, 3]);
    });
    test("should parse semver with zeros", () => {
      expect(parseSemver("0.0.0")).toEqual([0, 0, 0]);
    });
    test("should parse semver with large numbers", () => {
      expect(parseSemver("10.20.30")).toEqual([10, 20, 30]);
    });
    test("should parse semver with mixed single and multi-digit numbers", () => {
      expect(parseSemver("1.10.100")).toEqual([1, 10, 100]);
    });
  });
  suite("extractVersionsFromSemver", () => {
    test("should extract version components from a semver string", () => {
      const result = extractVersionsFromSemver("2.5.7");
      expect(result).toEqual({ major: 2, minor: 5, patch: 7 });
    });
    test("should extract version components from a semver with zeros", () => {
      const result = extractVersionsFromSemver("0.0.1");
      expect(result).toEqual({ major: 0, minor: 0, patch: 1 });
    });
    test("should default to 1.0.0 when given null", () => {
      const result = extractVersionsFromSemver(null);
      expect(result).toEqual({ major: 1, minor: 0, patch: 0 });
    });
    test("should default to 1.0.0 when given empty string", () => {
      const result = extractVersionsFromSemver("");
      expect(result).toEqual({ major: 1, minor: 0, patch: 0 });
    });
    test("should handle large version numbers", () => {
      const result = extractVersionsFromSemver("15.42.99");
      expect(result).toEqual({ major: 15, minor: 42, patch: 99 });
    });
  });
  suite("getNextVersionAfterSemver", () => {
    suite("patch updates", () => {
      test("should increment patch version", () => {
        expect(getNextVersionAfterSemver("1.2.3", "patch", false)).toBe("1.2.4");
      });
      test("should increment patch version from zero", () => {
        expect(getNextVersionAfterSemver("1.0.0", "patch", false)).toBe("1.0.1");
      });
      test("should increment patch version with large numbers", () => {
        expect(getNextVersionAfterSemver("5.10.99", "patch", false)).toBe(
          "5.10.100",
        );
      });
      test("should increment patch version regardless of isDraft", () => {
        expect(getNextVersionAfterSemver("1.2.3", "patch", true)).toBe("1.2.4");
      });
    });
    suite("minor updates", () => {
      test("should increment minor version and reset patch", () => {
        expect(getNextVersionAfterSemver("1.2.3", "minor", false)).toBe("1.3.0");
      });
      test("should increment minor version from zero", () => {
        expect(getNextVersionAfterSemver("1.0.5", "minor", false)).toBe("1.1.0");
      });
      test("should increment minor version with large numbers", () => {
        expect(getNextVersionAfterSemver("2.99.10", "minor", false)).toBe("2.100.0");
      });
      test("should increment minor version regardless of isDraft", () => {
        expect(getNextVersionAfterSemver("1.2.3", "minor", true)).toBe("1.3.0");
      });
    });
    suite("major updates", () => {
      test("should increment major version and reset minor and patch", () => {
        expect(getNextVersionAfterSemver("1.2.3", "major", false)).toBe("2.0.0");
      });
      test("should increment major version from zero", () => {
        expect(getNextVersionAfterSemver("0.5.10", "major", false)).toBe("1.0.0");
      });
      test("should increment major version with large numbers", () => {
        expect(getNextVersionAfterSemver("99.10.5", "major", false)).toBe("100.0.0");
      });
      test("should increment major version regardless of isDraft", () => {
        expect(getNextVersionAfterSemver("1.2.3", "major", true)).toBe("2.0.0");
      });
    });
    suite("initial updates", () => {
      test("should return 1.0.0 for non-draft initial version", () => {
        expect(getNextVersionAfterSemver("0.0.0", "initial", false)).toBe("1.0.0");
      });
      test("should return 0.1.0 for draft initial version", () => {
        expect(getNextVersionAfterSemver("0.0.0", "initial", true)).toBe("0.1.0");
      });
      test("should ignore previous version for initial updates", () => {
        expect(getNextVersionAfterSemver("5.10.20", "initial", false)).toBe("1.0.0");
        expect(getNextVersionAfterSemver("5.10.20", "initial", true)).toBe("0.1.0");
      });
    });
    suite("error handling", () => {
      test("should throw error for null updateType", () => {
        expect(() => getNextVersionAfterSemver("1.2.3", null, false)).toThrow(
          "Invalid updateType",
        );
      });
      test("should throw error for invalid updateType", () => {
        expect(() =>
          getNextVersionAfterSemver("1.2.3", "invalid" as RevisionUpdateType, false),
        ).toThrow("Invalid updateType");
      });
    });
  });
});
