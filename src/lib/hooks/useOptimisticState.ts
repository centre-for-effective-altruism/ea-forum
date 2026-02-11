import { useCallback, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

export const useOptimisticState = <Value, Props>(
  initialValue: Value,
  optimisticUpdate: (previous: Value, props: Props) => Value,
  asyncUpdate: (props: Props) => Promise<Value | { data?: Value }>,
  onError: (error: Error) => void = (error) => toast.error(error.message),
) => {
  const [value, setValue] = useState(initialValue);
  const [_isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);

  const execute = useCallback(
    async (props: Props) => {
      const previous = value;
      setValue(optimisticUpdate(previous, props));

      const requestId = ++requestIdRef.current;
      startTransition(async () => {
        try {
          const result = await asyncUpdate(props);
          if (requestId === requestIdRef.current) {
            const resultWithData = result as { data?: Value };
            if (result && "data" in resultWithData && resultWithData?.data) {
              setValue(resultWithData.data);
              return;
            }
            if (!result) {
              throw new Error("Async update missing data");
            }
            setValue(result as Value);
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
