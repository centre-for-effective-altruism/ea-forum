import { useCallback, useState } from "react";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import toast from "react-hot-toast";
import ClipboardIcon from "@heroicons/react/24/outline/ClipboardIcon";
import Popover from "./Popover";
import Select from "./Forms/Select";
import Input from "./Forms/Input";
import Type from "./Type";
import { RadioGroup } from "./Forms/RadioGroup";

type FeedConfig = {
  view: string;
  configurableKarma: boolean;
};

const rssFeeds = {
  Curated: {
    view: "curated-rss",
    configurableKarma: false,
  },
  Frontpage: {
    view: "frontpage-rss",
    configurableKarma: true,
  },
  "All posts": {
    view: "community-rss",
    configurableKarma: true,
  },
} as const satisfies Record<string, FeedConfig>;

type RssFeed = keyof typeof rssFeeds;

const rssFeedNames = Object.keys(rssFeeds) as RssFeed[];

const karmaThresholds = ["2", "30", "75", "125", "200"] as const;

type KarmaThreshold = (typeof karmaThresholds)[number];

const postsPerWeek: Record<KarmaThreshold, number> = {
  "2": 119,
  "30": 24,
  "75": 10,
  "125": 4,
  "200": 1,
};

const timePerWeekFromPosts = (posts: number) => {
  const minutes = posts * 11;
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  return `${Math.round(minutes / 60)} hours`;
};

const createFeedLink = (feed: RssFeed, karmaThreshold: KarmaThreshold) => {
  const { view, configurableKarma } = rssFeeds[feed];
  const params = new URLSearchParams();
  params.set("view", view);
  if (configurableKarma) {
    params.set("karmaThreshold", karmaThreshold);
  }
  return combineUrls(getSiteUrl(), "/feed.xml") + "?" + params.toString();
};

export default function RssPopover({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  const [feed, setFeed] = useState<RssFeed>("Frontpage");
  const [karmaThreshold, setKarmaThreshold] = useState<KarmaThreshold>("30");
  const link = createFeedLink(feed, karmaThreshold);
  const expectedPosts = postsPerWeek[karmaThreshold];
  const readTime = timePerWeekFromPosts(expectedPosts);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Copied RSS link to clipboard");
    } catch {
      toast.error("Something went wrong");
    }
  }, [link]);

  return (
    <Popover open={open} onClose={onClose}>
      <div
        data-component="RssPopover"
        className="w-[520px] max-w-full flex flex-col gap-5"
      >
        <Select
          label="Feed"
          value={feed}
          setValue={setFeed}
          options={rssFeedNames.map((feed) => ({ label: feed, value: feed }))}
        />
        {rssFeeds[feed].configurableKarma && (
          <div className="flex flex-col gap-2">
            <Type className="text-gray-600">
              Generate an RSS link to posts in &quot;{feed}&quot; with this karma and
              above
            </Type>
            <RadioGroup
              value={karmaThreshold}
              onChange={setKarmaThreshold}
              options={karmaThresholds.map((value) => ({ label: value, value }))}
              direction="horizontal"
            />
            <Type className="text-gray-600">
              That&apos;s roughly {expectedPosts} posts per week ({readTime} of
              reading)
            </Type>
          </div>
        )}
        <div className="flex gap-1 items-center">
          <Input
            label="RSS link"
            value={link}
            setValue={() => {}}
            onClick={copyToClipboard}
            className="grow"
          />
          <button
            onClick={copyToClipboard}
            className="flex justify-center cursor-pointer translate-y-[6px]"
          >
            <ClipboardIcon className="w-5 text-primary" />
          </button>
        </div>
      </div>
    </Popover>
  );
}
