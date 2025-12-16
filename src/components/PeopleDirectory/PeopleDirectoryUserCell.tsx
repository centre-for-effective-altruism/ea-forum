import type { SearchUser } from "@/lib/search/searchDocuments";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { InteractionWrapper } from "@/lib/hooks/useClickableCell";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import NewConversationButton from "../NewConversationButton";
import UserProfileImage from "../UserProfileImage";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PeopleDirectoryUserCell({
  user,
}: Readonly<{
  user: SearchUser;
}>) {
  const { currentUser } = useCurrentUser();
  const isCurrentUser = user._id === currentUser?._id;
  return (
    <div
      data-component="PeopleDirectoryUserCell"
      className="flex items-center gap-2 w-full"
    >
      <UserProfileImage user={user} size={32} />
      <Type style="directoryCell" className="grow">
        {user.displayName}
      </Type>
      {!isCurrentUser && (
        <InteractionWrapper>
          <Tooltip title={<Type>Send message</Type>} placement="bottom">
            <NewConversationButton
              currentUser={currentUser}
              userId={user._id}
              from="people_directory"
              openInNewTab
            >
              <EnvelopeIcon className="people-directory-message" />
            </NewConversationButton>
          </Tooltip>
        </InteractionWrapper>
      )}
    </div>
  );
}
