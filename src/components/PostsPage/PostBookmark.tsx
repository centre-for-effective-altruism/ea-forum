import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostBookmark() {
  const bookmarked = false;
  const Icon = bookmarked ? BookmarkSolidIcon : BookmarkOutlineIcon;
  return (
    <Tooltip title={<Type style="bodySmall">Save for later</Type>}>
      <button
        data-component="PostBookmark"
        aria-label="Save for later"
        className="
          flex items-center cursor-pointer text-gray-600 hover:text-gray-1000
        "
      >
        <Icon className="w-5" />
      </button>
    </Tooltip>
  );
}
