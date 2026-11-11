"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import clsx from "clsx";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import {
  getKeywordResultsLink,
  MAX_KEYWORD_LENGTH,
  normalizeKeyword,
} from "@/lib/keywordAlerts/keywordAlertHelpers";
import { rpc } from "@/lib/rpc";
import Input from "../Forms/Input";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

const onMutationError = (e: unknown) => {
  toast.error(e instanceof Error ? e.message : "Something went wrong");
  captureException(e);
};

export default function KeywordAlertsManager({
  initialKeywordAlerts,
  addKeyword,
}: Readonly<{
  initialKeywordAlerts: string[];
  addKeyword?: string;
}>) {
  const router = useRouter();
  const [keywordAlerts, setKeywordAlerts] = useState(initialKeywordAlerts);
  const [keyword, setKeyword] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const mutating = adding || removing;

  const onAdd = useCallback(async (rawKeyword: string) => {
    const normalized = normalizeKeyword(rawKeyword);
    if (!normalized) {
      return;
    }
    if (normalized.length > MAX_KEYWORD_LENGTH) {
      toast.error(`Keywords must be at most ${MAX_KEYWORD_LENGTH} characters long`);
      return;
    }
    setAdding(true);
    try {
      const { keywordAlerts, added } = await rpc.keywordAlerts.add({
        keyword: normalized,
      });
      setKeywordAlerts(keywordAlerts);
      setKeyword("");
      if (added) {
        toast.success(`Keyword alert added "${normalized}"`);
      } else {
        toast(`You already have an alert for "${normalized}"`);
      }
    } catch (e) {
      onMutationError(e);
    } finally {
      setAdding(false);
    }
  }, []);

  const onRemove = useCallback(async (keyword: string) => {
    setRemoving(true);
    try {
      const { keywordAlerts } = await rpc.keywordAlerts.remove({ keyword });
      setKeywordAlerts(keywordAlerts);
      toast.success(`Keyword alert removed "${keyword}"`);
    } catch (e) {
      onMutationError(e);
    } finally {
      setRemoving(false);
    }
  }, []);

  const onSubmit = useCallback(
    (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      if (!mutating) {
        void onAdd(keyword);
      }
    },
    [mutating, onAdd, keyword],
  );

  const handledAddKeyword = useRef(false);
  useEffect(() => {
    if (!addKeyword || handledAddKeyword.current) {
      return;
    }
    handledAddKeyword.current = true;
    void onAdd(addKeyword).finally(() => router.replace("/keywords"));
  }, [addKeyword, onAdd, router]);

  return (
    <div data-component="KeywordAlertsManager" className="flex flex-col gap-8">
      <Type className="text-gray-600">
        Get notified about new posts and comments that contain a keyword.
      </Type>
      <section className="flex flex-col gap-3">
        <Type style="sectionTitleSmall" As="h2">
          Add alert
        </Type>
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          <Input
            value={keyword}
            setValue={setKeyword}
            placeholder="Type a keyword..."
            disabled={adding}
            className="grow"
          />
          <Button
            variant="primaryFilled"
            type="submit"
            loading={adding}
            disabled={mutating || !normalizeKeyword(keyword)}
            eventProps={{ keyword }}
          >
            Add alert
          </Button>
        </form>
      </section>
      <section className="flex flex-col gap-3">
        <Type style="sectionTitleSmall" As="h2">
          Your alerts
        </Type>
        {keywordAlerts.length === 0 ? (
          <Type className="text-gray-600">No saved keyword alerts</Type>
        ) : (
          <ul
            className={clsx(
              "flex flex-col divide-y divide-gray-200 border-y border-gray-200",
              mutating && "opacity-60",
            )}
          >
            {keywordAlerts.map((keywordAlert) => (
              <li
                key={keywordAlert}
                className="flex items-center justify-between gap-4 py-2"
              >
                <Type className="min-w-0 break-words">
                  <Link
                    href={getKeywordResultsLink(keywordAlert)}
                    className="text-primary hover:opacity-70"
                  >
                    {keywordAlert}
                  </Link>
                </Type>
                <button
                  type="button"
                  aria-label="Remove"
                  title="Remove"
                  disabled={mutating}
                  onClick={() => void onRemove(keywordAlert)}
                  className="
                    shrink-0 p-1 rounded text-gray-600 hover:text-gray-1000
                    hover:bg-item-hover cursor-pointer
                    disabled:cursor-not-allowed disabled:hover:bg-transparent
                  "
                >
                  <XMarkIcon className="w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Type style="bodySmall">
        <Link
          href="/account?highlightField=notificationKeywordAlert"
          className="text-primary hover:opacity-70"
        >
          Manage notification frequency
        </Link>
      </Type>
    </div>
  );
}
