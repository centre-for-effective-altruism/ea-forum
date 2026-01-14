import { expect, suite, test } from "vitest";
import { createTestUser } from "./testHelpers";
import { createRevision } from "@/lib/revisions/revisionMutations";
import { randomId } from "@/lib/utils/random";
import { db } from "@/lib/db";
import type { EditorContents, EditorData } from "@/lib/ckeditor/editorHelpers";
import type { ChangeMetrics } from "@/lib/revisions/htmlToChangeMetrics";

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
});
