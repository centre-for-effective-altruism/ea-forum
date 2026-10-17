import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { createTestUser } from "./testHelpers";
import type { CurrentUser } from "@/lib/users/currentUser";
import UsersName from "@/components/UsersName";

const renderUsersName = ({
  currentUser = null,
}: {
  currentUser?: CurrentUser | null;
} = {}) =>
  renderToStaticMarkup(
    <CurrentUserProvider user={currentUser}>
      <UsersName
        user={{
          slug: "deleted-user",
          displayName: "Deleted User",
          deleted: true,
        }}
      />
    </CurrentUserProvider>,
  );

test("UsersName keeps deleted users anonymous for logged out viewers", () => {
  const html = renderUsersName();

  expect(html).toContain("[anonymous]");
  expect(html).not.toContain("Deleted User");
  expect(html).not.toContain("/users/deleted-user");
});

test("UsersName treats a missing user as anonymous", () => {
  const html = renderToStaticMarkup(
    <CurrentUserProvider user={null}>
      <UsersName user={null} />
    </CurrentUserProvider>,
  );

  expect(html).toContain("[anonymous]");
});

test("UsersName keeps deleted users anonymous for normal logged-in viewers", async () => {
  const html = renderUsersName({
    currentUser: await createTestUser(),
  });

  expect(html).toContain("[anonymous]");
  expect(html).not.toContain("Deleted User");
  expect(html).not.toContain("/users/deleted-user");
});

test("UsersName reveals deleted users for privileged contexts", async () => {
  const html = renderToStaticMarkup(
    <CurrentUserProvider
      user={await createTestUser({
        _id: "admin",
        slug: "admin",
        username: "admin",
        displayName: "Admin",
        isAdmin: true,
      })}
    >
      <UsersName
        user={{
          slug: "deleted-user",
          displayName: "Deleted User",
          deleted: true,
        }}
      />
    </CurrentUserProvider>,
  );

  expect(html).toContain("[anonymous]");
  expect(html).toContain("Deleted User");
  expect(html).toContain("/users/deleted-user");
});
