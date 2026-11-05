"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { captureException } from "@sentry/nextjs";
import MagnifyingGlassIcon from "@heroicons/react/16/solid/MagnifyingGlassIcon";
import XMarkIcon from "@heroicons/react/16/solid/XMarkIcon";
import type { SearchUser } from "@/lib/search/searchDocuments";
import { getSearchClient } from "@/lib/search/searchClient";
import { userGetDisplayName, UserDisplayNameInfo } from "@/lib/users/userHelpers";
import UserProfileImage from "../UserProfileImage";
import Label from "../Forms/Label";
import Loading from "../Loading";
import TimeAgo from "../TimeAgo";
import Type, { typeStyles } from "../Type";

export type UserMultiSelectUser = UserDisplayNameInfo & {
  _id: string;
  profileImageId?: string | null;
};

const HITS_PER_PAGE = 10;

const toSelectedUser = ({
  _id,
  displayName,
  username,
  profileImageId,
}: SearchUser): UserMultiSelectUser => ({
  _id,
  displayName,
  username,
  profileImageId,
});

const UserHit = ({
  user,
  onSelect,
}: {
  user: SearchUser;
  onSelect: (user: SearchUser) => void;
}) => (
  <button
    type="button"
    onClick={() => onSelect(user)}
    className="
      flex items-center gap-3 w-full px-2 py-2 text-left rounded cursor-pointer
      hover:bg-surface-floating-hover
    "
  >
    <UserProfileImage user={user} size={32} />
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-3 text-gray-600">
        <Type style="bodyMedium" className="text-gray-1000 truncate">
          {user.displayName}
        </Type>
        <TimeAgo time={user.createdAt} textStyle="bodySmall" As="span" />
        <Type style="bodySmall" As="span">
          {user.karma ?? 0} karma
        </Type>
      </div>
      {(user.jobTitle || user.organization) && (
        <Type style="bodySmall" className="text-gray-600 truncate">
          {user.jobTitle} {user.organization && `@ ${user.organization}`}
        </Type>
      )}
    </div>
  </button>
);

export default function UserMultiSelect({
  value,
  onChange,
  excludeUserIds,
  label,
  placeholder = "Search for user...",
  autoFocus,
}: Readonly<{
  value: UserMultiSelectUser[];
  onChange: (users: UserMultiSelectUser[]) => void;
  excludeUserIds?: string[];
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}>) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[] | null>(null);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!query) {
      setResults(null);
      setError(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setResults(null);
    setError(false);
    void (async () => {
      try {
        const [result] = await getSearchClient().search<SearchUser>([
          {
            indexName: "users",
            query,
            params: { query, hitsPerPage: HITS_PER_PAGE, page: 0 },
          },
        ]);
        if (requestIdRef.current === requestId) {
          setResults(result?.hits ?? []);
        }
      } catch (e) {
        captureException(e);
        if (requestIdRef.current === requestId) {
          setError(true);
        }
      }
    })();
  }, [query]);

  const onQueryChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  }, []);

  const onSelect = useCallback(
    (user: SearchUser) => {
      onChange([...value, toSelectedUser(user)]);
      setQuery("");
    },
    [value, onChange],
  );

  const onRemove = useCallback(
    (userId: string) => {
      onChange(value.filter(({ _id }) => _id !== userId));
    },
    [value, onChange],
  );

  const hiddenUserIds = new Set([
    ...value.map(({ _id }) => _id),
    ...(excludeUserIds ?? []),
  ]);
  const visibleResults = results?.filter(({ _id }) => !hiddenUserIds.has(_id));

  const onKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (visibleResults?.[0]) {
          onSelect(visibleResults[0]);
        }
      } else if (ev.key === "Backspace" && !query && value.length) {
        onRemove(value[value.length - 1]._id);
      }
    },
    [visibleResults, onSelect, query, value, onRemove],
  );

  return (
    <div data-component="UserMultiSelect" className="flex flex-col gap-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        className="
          flex items-center gap-2 min-h-12 p-1 pl-3 rounded bg-gray-100
          border border-gray-300 focus-within:border-primary
        "
      >
        <MagnifyingGlassIcon className="w-4 shrink-0 text-gray-600" />
        <div className="flex flex-wrap items-center gap-1 grow min-w-0">
          {value.map((user) => (
            <span
              key={user._id}
              className="flex items-center gap-1 h-7 pl-2 pr-1 rounded bg-gray-300"
            >
              <Type style="bodySmallMedium" As="span" className="text-gray-1000">
                {userGetDisplayName(user)}
              </Type>
              <button
                type="button"
                onClick={() => onRemove(user._id)}
                aria-label={`Remove ${userGetDisplayName(user)}`}
                className="cursor-pointer text-gray-600 hover:text-gray-1000"
              >
                <XMarkIcon className="w-4" />
              </button>
            </span>
          ))}
          <input
            id={id}
            value={query}
            onChange={onQueryChange}
            onKeyDown={onKeyDown}
            placeholder={value.length ? undefined : placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            className={clsx(
              typeStyles.bodySmall,
              "grow min-w-[120px] h-10 bg-transparent outline-none text-gray-1000",
            )}
          />
        </div>
      </div>
      {query && (
        <div className="flex flex-col max-h-[300px] overflow-y-auto">
          {error && (
            <Type style="bodySmall" className="text-error px-2">
              Failed to search for users - please try again
            </Type>
          )}
          {!error && !visibleResults && <Loading className="py-2" />}
          {visibleResults?.length === 0 && (
            <Type style="bodySmall" className="text-gray-600 px-2">
              No users found
            </Type>
          )}
          {visibleResults?.map((user) => (
            <UserHit key={user._id} user={user} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
