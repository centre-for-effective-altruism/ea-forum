import { useOnboarding } from "./useOnboarding";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

export default function LogoutConfirmationDialog({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  const { currentUser } = useOnboarding();
  return (
    <Popover open={open} onClose={onClose} className="flex flex-col gap-2">
      <Type style="onboardingTitle">Confirm logout</Type>
      <Type style="bodyMedium" className="max-w-[350px]">
        You are currently logged in with the email {currentUser.email}, but have not
        chosen a username.
      </Type>
      <div className="flex items-center justify-end gap-2">
        <Button variant="greyFilled" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primaryFilled" href="/logout">
          Logout
        </Button>
      </div>
    </Popover>
  );
}
