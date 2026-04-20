import BellIcon from "@heroicons/react/24/outline/BellIcon";
import HeaderButton from "../Header/HeaderButton";
import NotificationsDropdown from "./NotificationsDropdown";

export default function NotificationsHeaderButton() {
  return (
    <NotificationsDropdown>
      <HeaderButton Icon={BellIcon} description="Notifications" />
    </NotificationsDropdown>
  );
}
