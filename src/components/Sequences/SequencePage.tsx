import type { SequencePageData } from "@/lib/sequences/sequenceQueries";
import type { CurrentUser } from "@/lib/users/currentUser";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  sequenceGetEditUrl,
  userCanEditSequence,
} from "@/lib/sequences/sequenceHelpers";
import { formatShortDate } from "@/lib/timeUtils";
import clsx from "clsx";
import PencilSquareIcon from "@heroicons/react/24/outline/PencilSquareIcon";
import SequencePageSubscribeButton from "./SequencePageSubscribeButton";
import SequencePageChapter from "./SequencePageChapter";
import PostBody from "../ContentStyles/PostBody";
import CloudinaryBanner from "../CloudinaryBanner";
import UsersName from "../UsersName";
import Type from "../Type";
import Link from "../Link";

export default function SequencePage({
  sequence,
  currentUser,
}: Readonly<{
  sequence: SequencePageData;
  currentUser: CurrentUser | null;
}>) {
  return (
    <div data-component="SequencePage" className="relative w-full pb-16">
      {sequence.bannerImageId && (
        <CloudinaryBanner
          publicId={sequence.bannerImageId}
          preCrop={false}
          className="
            absolute inset-x-0 top-0 h-[380px] overflow-hidden pointer-events-none
            bg-gray-200
          "
        >
          <div
            className="
              absolute inset-0
              bg-[linear-gradient(to_top,rgb(0_0_0/0.6)_0%,rgb(0_0_0/0)_60%)]
            "
          />
        </CloudinaryBanner>
      )}
      <div
        className={clsx(
          "relative max-w-[765px] mx-auto px-4",
          sequence.bannerImageId ? "pt-[240px]" : "pt-10 sm:pt-16",
        )}
      >
        <div className="rounded bg-gray-0 p-6 sm:p-10 flex flex-col gap-8">
          <header className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="grow min-w-0 flex flex-col gap-2">
              <Type As="h1" style="postsPageTitle" className="text-gray-1000">
                {sequence.draft && "[Draft] "}
                {sequence.title}
              </Type>
              <Type style="bodyMedium" className="text-gray-600">
                {formatShortDate(sequence.createdAt)}
                {sequence.user && (
                  <>
                    {" by "}
                    <UsersName user={sequence.user} />
                  </>
                )}
              </Type>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {userCanEditSequence(currentUser, sequence) && (
                <Link
                  href={sequenceGetEditUrl(sequence._id)}
                  className="
                    flex items-center gap-1 text-gray-600 hover:text-gray-1000
                  "
                >
                  <PencilSquareIcon className="w-4" />
                  <Type As="span" style="bodyMedium">
                    Edit sequence
                  </Type>
                </Link>
              )}
              <SequencePageSubscribeButton sequenceId={sequence._id} />
            </div>
          </header>
          {sequence.html && <PostBody html={sequence.html} />}
          <AnalyticsContext listContext="sequencePage" sequenceId={sequence._id}>
            <div className="flex flex-col gap-10">
              {sequence.chapters.map((chapter) => (
                <SequencePageChapter
                  key={chapter._id}
                  chapter={chapter}
                  sequenceId={sequence._id}
                />
              ))}
            </div>
          </AnalyticsContext>
        </div>
      </div>
    </div>
  );
}
