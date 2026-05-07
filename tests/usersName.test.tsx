import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import UsersName from "@/components/UsersName";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import type { CurrentUser } from "@/lib/users/currentUser";
import { defaultKarmaChangeSettings } from "@/lib/users/karmaChangesTypes";

const createCurrentUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  _id: "viewer",
  displayName: "Viewer",
  username: "viewer",
  email: "viewer@example.com",
  profileImageId: null,
  slug: "viewer",
  karma: 0,
  isAdmin: false,
  theme: { name: "default" },
  hideIntercom: false,
  acceptedTos: true,
  hideNavigationSidebar: false,
  hideHomeRHS: false,
  usernameUnset: false,
  currentFrontpageFilter: null,
  frontpageFilterSettings: null,
  lastNotificationsCheck: null,
  expandedFrontpageSections: null,
  markDownPostEditor: false,
  banned: null,
  groups: [],
  conversationsDisabled: false,
  mentionsDisabled: false,
  showCommunityInRecentDiscussion: false,
  hideCommunitySection: false,
  reviewedByUserId: null,
  snoozedUntilContentCount: null,
  subscribedToDigest: false,
  hideSubscribePoke: false,
  mongoLocation: null,
  karmaChangeNotifierSettings: defaultKarmaChangeSettings,
  karmaChangeLastOpened: null,
  karmaChangeBatchStart: null,
  ...overrides,
});

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

test("UsersName keeps deleted users anonymous for normal logged-in viewers", () => {
  const html = renderUsersName({
    currentUser: createCurrentUser(),
  });

  expect(html).toContain("[anonymous]");
  expect(html).not.toContain("Deleted User");
  expect(html).not.toContain("/users/deleted-user");
});

test("UsersName reveals deleted users for privileged contexts", () => {
  const html = renderToStaticMarkup(
    <CurrentUserProvider
      user={createCurrentUser({
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
