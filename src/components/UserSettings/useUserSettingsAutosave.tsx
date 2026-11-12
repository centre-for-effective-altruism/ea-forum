import { useCallback, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import isEqual from "lodash/isEqual";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import { useTracking } from "@/lib/analyticsEvents";
import type { UserSettingField, UserSettings } from "@/lib/users/userSettings";
import Type from "../Type";

export const autosaveToastId = "userSettingsAutosave";

const getErrorMessage = (e: unknown) =>
  e instanceof Error && e.message ? e.message : "Failed to save settings";

type SaveUserSetting = <K extends UserSettingField>(
  field: K,
  value: UserSettings[K],
) => void;

export const useUserSettingsAutosave = (
  userId: string,
  initialSettings: UserSettings,
  onSaved: (settings: UserSettings) => void,
) => {
  const { captureEvent } = useTracking();
  const [settings, setSettings] = useState(initialSettings);
  const savedRef = useRef(initialSettings);
  const queueRef = useRef(Promise.resolve());
  const pendingCountRef = useRef(0);

  const saveSetting: SaveUserSetting = useCallback(
    (field, value) => {
      setSettings((current) => ({ ...current, [field]: value }));
      pendingCountRef.current++;
      queueRef.current = queueRef.current.then(async () => {
        try {
          if (isEqual(savedRef.current[field], value)) {
            return;
          }
          toast.loading(<Type>Saving...</Type>, { id: autosaveToastId });
          const saved = await rpc.users.updateSettings({
            userId,
            data: { [field]: value },
          });
          const serverChanges = Object.fromEntries(
            Object.entries(saved).filter(
              ([key, savedValue]) =>
                key === field ||
                !isEqual(savedValue, savedRef.current[key as UserSettingField]),
            ),
          );
          savedRef.current = saved;
          setSettings((current) => ({ ...current, ...serverChanges }));
          captureEvent("userSettingChanged", { field });
          onSaved(saved);
          if (pendingCountRef.current === 1) {
            toast.success(<Type>Saved</Type>, { id: autosaveToastId });
          }
        } catch (e) {
          console.error(e);
          captureException(e);
          toast.error(<Type>{getErrorMessage(e)}</Type>, { id: autosaveToastId });
          setSettings((current) =>
            isEqual(current[field], value)
              ? { ...current, [field]: savedRef.current[field] }
              : current,
          );
        } finally {
          pendingCountRef.current--;
        }
      });
    },
    [userId, captureEvent, onSaved],
  );

  return { settings, saveSetting };
};
