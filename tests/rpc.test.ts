import { expect, suite, test, vi } from "vitest";
import { rpc } from "@/lib/rpc";
import { rpcHandler } from "@/lib/rpcHandler";
import { createTestConversation, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  vi.stubGlobal("window", { location: { origin: "http://localhost" } });
  globalThis.fetch = async (input, init) => {
    const { rpcHandler } = await import("@/lib/rpcHandler");
    const { response } = await rpcHandler.handle(new Request(input, init), {
      prefix: "/rpc",
      context: {},
    });
    return response ?? new Response("Not found", { status: 404 });
  };
});

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentUser: mockGetCurrentUser,
}));

suite("RPC CSRF protection", () => {
  test("the RPC client can call procedures, including batched calls", async () => {
    mockGetCurrentUser.mockResolvedValue(await createTestUser());
    expect(
      await Promise.all([rpc.messages.unreadCount(), rpc.messages.unreadCount()]),
    ).toStrictEqual([0, 0]);
  });

  test("rejects form submissions without the CSRF header", async () => {
    const user = await createTestUser();
    mockGetCurrentUser.mockResolvedValue(user);
    const conversation = await createTestConversation({
      participantIds: [user._id],
    });
    const form = new FormData();
    form.set(
      "data",
      JSON.stringify({
        json: { conversationId: conversation._id, title: "Forged" },
      }),
    );
    const { response } = await rpcHandler.handle(
      new Request("http://localhost/rpc/messages/updateConversation", {
        method: "POST",
        body: form,
      }),
      { prefix: "/rpc", context: {} },
    );
    expect(response?.status).toBe(403);
  });
});
