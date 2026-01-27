import { useCallback, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

export const useOptimisticState = <Value, Args>(
  initialValue: Value,
  optimisticUpdate: (previous: Value, args: Args) => Value,
  asyncUpdate: (args: Args) => Promise<{ data?: Value }>,
  onError: (error: Error) => void = (error) => toast.error(error.message),
) => {
  const [value, setValue] = useState(initialValue);
  const [_isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);

  const execute = useCallback(
    async (args: Args) => {
      const previous = value;
      setValue(optimisticUpdate(previous, args));

      const requestId = requestIdRef.current++;
      startTransition(async () => {
        try {
          const result = await asyncUpdate(args);
          if (requestId === requestIdRef.current) {
            if (!result.data) {
              throw new Error("Async update missing data");
            }
            setValue(result.data);
          }
        } catch (e) {
          if (requestId === requestIdRef.current) {
            setValue(previous);
            console.error(e);
            onError(e instanceof Error ? e : new Error("Something went wrong"));
          }
        }
      });
    },
    [optimisticUpdate, asyncUpdate, onError, value],
  );

  return { value, execute };
};
