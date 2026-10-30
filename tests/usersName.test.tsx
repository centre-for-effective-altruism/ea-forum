import { expect, test } from "vitest";
import type { ReactNode } from "react";
import { prerender } from "react-dom/static";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { createTestUser } from "./testHelpers";
import type { CurrentUser } from "@/lib/users/currentUser";
import UsersName from "@/components/UsersName";

const renderWithCurrentUser = async (
  currentUser: CurrentUser | null,
  children: ReactNode,
) => {
  const { prelude } = await prerender(
    <CurrentUserProvider userPromise={Promise.resolve(currentUser)}>
      {children}
    </CurrentUserProvider>,
  );
  return new Response(prelude).text();
};

const renderUsersName = ({
  currentUser = null,
}: {
  currentUser?: CurrentUser | null;
} = {}) =>
  renderWithCurrentUser(
    currentUser,
    <UsersName
      user={{
        slug: "deleted-user",
        displayName: "Deleted User",
        deleted: true,
      }}
    />,
  );

test("UsersName keeps deleted users anonymous for logged out viewers", async () => {
  const html = await renderUsersName();

  expect(html).toContain("[anonymous]");
  expect(html).not.toContain("Deleted User");
  expect(html).not.toContain("/users/deleted-user");
});

test("UsersName treats a missing user as anonymous", async () => {
  const html = await renderWithCurrentUser(null, <UsersName user={null} />);

  expect(html).toContain("[anonymous]");
});

test("UsersName keeps deleted users anonymous for normal logged-in viewers", async () => {
  const html = await renderUsersName({
    currentUser: await createTestUser(),
  });

  expect(html).toContain("[anonymous]");
  expect(html).not.toContain("Deleted User");
  expect(html).not.toContain("/users/deleted-user");
});

test("UsersName reveals deleted users for privileged contexts", async () => {
  const html = await renderUsersName({
    currentUser: await createTestUser({
      _id: "admin",
      slug: "admin",
      username: "admin",
      displayName: "Admin",
      isAdmin: true,
    }),
  });

  expect(html).toContain("[anonymous]");
  expect(html).toContain("Deleted User");
  expect(html).toContain("/users/deleted-user");
});
