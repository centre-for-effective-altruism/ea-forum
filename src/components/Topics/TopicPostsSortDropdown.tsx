"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useTracking } from "@/lib/analyticsEvents";
import { allPostsSortedBys } from "@/lib/posts/allPostsSettings";
import {
  topicPostsSortedByValues,
  type TopicPostsSortedBy,
} from "@/lib/tags/topicPageParams";
import InlineSelect from "../Forms/InlineSelect";
import Loading from "../Loading";
import Type from "../Type";

const options = topicPostsSortedByValues.map((value) => ({
  value,
  label: value === "relevance" ? "Most relevant" : allPostsSortedBys[value].label,
}));

export default function TopicPostsSortDropdown({
  sortedBy,
  className,
}: Readonly<{
  sortedBy: TopicPostsSortedBy;
  className?: string;
}>) {
  const { captureEvent } = useTracking();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onChange = useCallback(
    (value: TopicPostsSortedBy) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sortedBy", value);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
      captureEvent("topicPostsSortUpdate", { sortedBy: value });
    },
    [captureEvent, searchParams, router, pathname],
  );

  return (
    <div
      data-component="TopicPostsSortDropdown"
      className={clsx("flex items-center gap-2", className)}
    >
      {isPending && <Loading />}
      <Type style="bodyMedium" className="text-gray-600">
        Sorted by{" "}
        <InlineSelect
          value={sortedBy}
          setValue={onChange}
          options={options}
          placement="bottom-end"
        />
      </Type>
    </div>
  );
}
