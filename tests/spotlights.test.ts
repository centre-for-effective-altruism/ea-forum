import { suite, test, expect, beforeEach } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import { db } from "@/lib/db";
import { chapters, sequences, spotlights, User } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { nHoursAgo } from "@/lib/timeUtils";
import {
  selectActiveSpotlight,
  spotlightInputSchema,
  SpotlightInput,
} from "@/lib/spotlights/spotlightHelpers";
import {
  createSpotlight,
  deleteSpotlight,
  updateSpotlight,
} from "@/lib/spotlights/spotlightMutations";
import {
  fetchActiveSpotlight,
  fetchAllSpotlightsForAdmin,
} from "@/lib/spotlights/spotlightQueries";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";

const hoursFromNow = (hours: number) => nHoursAgo(-hours).toISOString();

const makeInput = (
  documentId: string,
  overrides?: Partial<SpotlightInput>,
): SpotlightInput => ({
  documentType: "Post",
  documentId,
  title: "Test spotlight",
  imageId: "spotlights/test-image",
  blockColor: "#0c869b",
  showBlockColor: true,
  startAt: hoursFromNow(-1),
  endAt: hoursFromNow(1),
  ...overrides,
});

suite("Spotlights", () => {
  suite("selectActiveSpotlight", () => {
    const spotlight = (startAt: string, endAt: string) => ({ startAt, endAt });

    test("returns null when no spotlight is active", () => {
      expect(selectActiveSpotlight([])).toBe(null);
      expect(
        selectActiveSpotlight([
          spotlight(hoursFromNow(-3), hoursFromNow(-1)), // ended
          spotlight(hoursFromNow(1), hoursFromNow(3)), // not started
        ]),
      ).toBe(null);
    });
    test("returns the single active spotlight", () => {
      const active = spotlight(hoursFromNow(-1), hoursFromNow(1));
      expect(
        selectActiveSpotlight([
          spotlight(hoursFromNow(-3), hoursFromNow(-1)),
          active,
          spotlight(hoursFromNow(1), hoursFromNow(3)),
        ]),
      ).toBe(active);
    });
    test("the most recently started spotlight wins when overlapping", () => {
      const older = spotlight(hoursFromNow(-5), hoursFromNow(5));
      const newer = spotlight(hoursFromNow(-1), hoursFromNow(2));
      expect(selectActiveSpotlight([older, newer])).toBe(newer);
      expect(selectActiveSpotlight([newer, older])).toBe(newer);
    });
    test("startAt is inclusive and endAt is exclusive", () => {
      const now = new Date("2026-07-02T12:00:00.000Z");
      const starting = spotlight(
        "2026-07-02T12:00:00.000Z",
        "2026-07-02T13:00:00.000Z",
      );
      const ending = spotlight(
        "2026-07-02T11:00:00.000Z",
        "2026-07-02T12:00:00.000Z",
      );
      expect(selectActiveSpotlight([starting], now)).toBe(starting);
      expect(selectActiveSpotlight([ending], now)).toBe(null);
    });
  });

  suite("spotlightInputSchema", () => {
    test("rejects a missing image", () => {
      const result = spotlightInputSchema.safeParse(
        makeInput(randomId(), { imageId: "" }),
      );
      expect(result.success).toBe(false);
    });
    test("rejects a start date after the end date", () => {
      const result = spotlightInputSchema.safeParse(
        makeInput(randomId(), {
          startAt: hoursFromNow(2),
          endAt: hoursFromNow(1),
        }),
      );
      expect(result.success).toBe(false);
    });
    test("rejects an invalid block color", () => {
      const result = spotlightInputSchema.safeParse(
        makeInput(randomId(), { blockColor: "red" }),
      );
      expect(result.success).toBe(false);
    });
    test("accepts valid input, with or without a block color", () => {
      expect(spotlightInputSchema.safeParse(makeInput(randomId())).success).toBe(
        true,
      );
      expect(
        spotlightInputSchema.safeParse(makeInput(randomId(), { blockColor: null }))
          .success,
      ).toBe(true);
    });
  });

  suite("mutations", () => {
    let admin: User;

    beforeEach(async () => {
      await db.delete(spotlights);
      admin = await createTestUser({ isAdmin: true });
    });

    test("non-admins cannot create, update or delete spotlights", async () => {
      const user = await createTestUser();
      const input = makeInput(randomId());
      await expect(createSpotlight(user, input)).rejects.toThrow(
        "Permission denied",
      );
      await expect(createSpotlight(null, input)).rejects.toThrow(
        "Permission denied",
      );
      await expect(updateSpotlight(user, randomId(), input)).rejects.toThrow(
        "Permission denied",
      );
      await expect(deleteSpotlight(user, randomId())).rejects.toThrow(
        "Permission denied",
      );
    });

    test("creates a spotlight with a rich text description", async () => {
      const post = await createTestPost();
      const _id = await createSpotlight(admin, {
        ...makeInput(post._id),
        description: {
          originalContents: {
            type: "ckEditorMarkup",
            data: '<p>A description with a <a href="https://example.com">link</a></p>',
          },
          updateType: "initial",
          commitMessage: "",
        },
      });
      const created = await db.query.spotlights.findFirst({
        where: { _id },
        with: {
          description: {
            columns: { html: true },
          },
        },
      });
      expect(created).toBeTruthy();
      expect(created!.title).toBe("Test spotlight");
      expect(created!.imageId).toBe("spotlights/test-image");
      expect(created!.descriptionLatest).toBeTruthy();
      expect(created!.description?.html).toContain('href="https://example.com"');
    });

    test("updates and deletes a spotlight", async () => {
      const post = await createTestPost();
      const _id = await createSpotlight(admin, makeInput(post._id));
      await updateSpotlight(admin, _id, {
        ...makeInput(post._id),
        title: "Updated title",
        showBlockColor: false,
      });
      const updated = await db.query.spotlights.findFirst({ where: { _id } });
      expect(updated!.title).toBe("Updated title");
      expect(updated!.showBlockColor).toBe(false);

      await deleteSpotlight(admin, _id);
      const deleted = await db.query.spotlights.findFirst({ where: { _id } });
      expect(deleted).toBeUndefined();
    });

    test("updating a missing spotlight throws", async () => {
      await expect(
        updateSpotlight(admin, randomId(), makeInput(randomId())),
      ).rejects.toThrow("Spotlight not found");
    });
  });

  suite("fetchActiveSpotlight", () => {
    let admin: User;

    beforeEach(async () => {
      await db.delete(spotlights);
      admin = await createTestUser({ isAdmin: true });
    });

    test("returns null when nothing is scheduled", async () => {
      expect(await fetchActiveSpotlight(null)).toBe(null);
    });

    test("returns null when the only spotlight is in the future", async () => {
      const post = await createTestPost();
      await createSpotlight(
        admin,
        makeInput(post._id, { startAt: hoursFromNow(1), endAt: hoursFromNow(2) }),
      );
      expect(await fetchActiveSpotlight(null)).toBe(null);
    });

    test("returns the active post spotlight with its link target", async () => {
      const post = await createTestPost();
      const _id = await createSpotlight(admin, makeInput(post._id));
      const active = await fetchActiveSpotlight(null);
      expect(active?._id).toBe(_id);
      expect(active?.url).toBe(postGetPageUrl({ post }));
      expect(active?.sequencePosts).toEqual([]);
    });

    test("returns null when the spotlighted post no longer exists", async () => {
      await createSpotlight(admin, makeInput(randomId()));
      expect(await fetchActiveSpotlight(null)).toBe(null);
    });

    test("the most recently started of two overlapping spotlights wins", async () => {
      const [postA, postB] = await Promise.all([createTestPost(), createTestPost()]);
      await createSpotlight(
        admin,
        makeInput(postA._id, { startAt: hoursFromNow(-5), endAt: hoursFromNow(5) }),
      );
      const newerId = await createSpotlight(
        admin,
        makeInput(postB._id, { startAt: hoursFromNow(-1), endAt: hoursFromNow(2) }),
      );
      const active = await fetchActiveSpotlight(null);
      expect(active?._id).toBe(newerId);
    });

    test("returns sequence spotlights with their posts in order", async () => {
      const user = await createTestUser();
      const [postA, postB] = await Promise.all([createTestPost(), createTestPost()]);
      const sequenceId = randomId();
      await db.insert(sequences).values({
        _id: sequenceId,
        userId: user._id,
        title: "Test sequence",
        lastUpdated: new Date().toISOString(),
      });
      await db.insert(chapters).values({
        _id: randomId(),
        sequenceId,
        number: 1,
        postIds: [postA._id, postB._id],
      });
      await createSpotlight(
        admin,
        makeInput(sequenceId, { documentType: "Sequence" }),
      );
      const active = await fetchActiveSpotlight(null);
      expect(active?.url).toBe(`/s/${sequenceId}`);
      expect(active?.sequencePosts.map(({ _id }) => _id)).toEqual([
        postA._id,
        postB._id,
      ]);
      expect(active?.sequencePosts[0].isRead).toBe(false);
    });
  });

  suite("fetchAllSpotlightsForAdmin", () => {
    beforeEach(async () => {
      await db.delete(spotlights);
    });

    test("is admin-only", async () => {
      const user = await createTestUser();
      await expect(fetchAllSpotlightsForAdmin(user)).rejects.toThrow(
        "Permission denied",
      );
      await expect(fetchAllSpotlightsForAdmin(null)).rejects.toThrow(
        "Permission denied",
      );
    });

    test("resolves linked documents and sorts by most recent schedule", async () => {
      const admin = await createTestUser({ isAdmin: true });
      const post = await createTestPost();
      const earlierId = await createSpotlight(
        admin,
        makeInput(post._id, { startAt: hoursFromNow(-2), endAt: hoursFromNow(-1) }),
      );
      const laterId = await createSpotlight(
        admin,
        makeInput(post._id, { startAt: hoursFromNow(1), endAt: hoursFromNow(2) }),
      );
      const all = await fetchAllSpotlightsForAdmin(admin);
      expect(all.map(({ _id }) => _id)).toEqual([laterId, earlierId]);
      expect(all[0].documentTitle).toBe(post.title);
      expect(all[0].url).toBe(postGetPageUrl({ post }));
    });

    test("flags spotlights whose document is missing", async () => {
      const admin = await createTestUser({ isAdmin: true });
      await createSpotlight(admin, makeInput(randomId()));
      const all = await fetchAllSpotlightsForAdmin(admin);
      expect(all[0].documentTitle).toBe(null);
      expect(all[0].url).toBe(null);
    });
  });
});
