import { useCallback, useState } from "react";
import { userIsInGroup } from "../users/userHelpers";
import { useCurrentUser } from "./useCurrentUser";
import { rpc } from "../rpc";
import toast from "react-hot-toast";

export const useAdminToggle = () => {
  const { currentUser } = useCurrentUser();
  const [isAdmin, setIsAdmin] = useState(!!currentUser?.isAdmin);
  const showAdminToggle = userIsInGroup(currentUser, "realAdmins");
  const setAdmin = useCallback(async () => {
    const toastId = toast.loading("Toggling admin powers...");
    try {
      setIsAdmin((admin) => !admin);
      await rpc.users.toggleAdmin();
      window.location.reload();
    } catch (e) {
      setIsAdmin((admin) => !admin);
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      toast.dismiss(toastId);
    }
  }, []);
  return {
    showAdminToggle,
    isAdmin,
    setAdmin,
  };
};
