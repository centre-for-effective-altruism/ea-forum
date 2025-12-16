import { useTracking } from "@/lib/analyticsEvents";
import type { SearchUser } from "@/lib/search/searchDocuments";
import { socialMediaSiteNameToHref } from "@/lib/users/userHelpers";
import { objectKeys } from "@/lib/typeHelpers";
import { EMPTY_TEXT_PLACEHOLDER } from "./PeopleDirectoryTextCell";
import SocialMediaIcon from "../SocialMediaIcon";
import Type from "../Type";

export default function PeopleDirectorySocialMediaCell({
  user,
}: Readonly<{
  user: SearchUser;
}>) {
  const { captureEvent } = useTracking();
  const urls = user.socialMediaUrls ?? {};
  const keys = objectKeys(urls);
  return (
    <Type
      data-component="PeopleDirectorySocialMediaCell"
      style="directoryCell"
      className="flex gap-x-3 gap-y-[2px] flex-wrap"
    >
      {keys.length < 1 && (
        <span className="text-gray-600">{EMPTY_TEXT_PLACEHOLDER}</span>
      )}
      {keys.map((field) => {
        const url = urls[field];
        if (!url) {
          return null;
        }
        const href = socialMediaSiteNameToHref(field, url);
        return (
          <a
            key={field}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              captureEvent("socialMediaClick", {
                field,
                href,
                userUrl: url,
                targetUserId: user._id,
              })
            }
          >
            <SocialMediaIcon
              name={field}
              className="w-[20px] h-[20px] fill-gray-600 hover:fill-gray-800"
            />
          </a>
        );
      })}
    </Type>
  );
}
