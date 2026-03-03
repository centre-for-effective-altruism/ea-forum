import { MouseEvent, useCallback } from "react";
import { useObserver } from "./useObserver";
import { rpc } from "../rpc";

export const useRecommendationAnalytics = <
  ObservedElement extends HTMLElement = HTMLDivElement,
  ClickedElement extends HTMLElement = HTMLDivElement,
>(
  postId: string,
  onClickHandler?: (e: MouseEvent<ClickedElement>) => void,
  disableAnalytics = false,
) => {
  const onObserve = useCallback(() => {
    if (!disableAnalytics) {
      void rpc.recommendations.observe({ postId });
    }
  }, [postId, disableAnalytics]);

  const ref = useObserver<ObservedElement>({
    onEnter: onObserve,
    maxTriggers: 1,
  });

  const onClick = useCallback(
    (e: MouseEvent<ClickedElement>) => {
      if (!disableAnalytics) {
        void rpc.recommendations.click({ postId });
      }
      onClickHandler?.(e);
    },
    [postId, disableAnalytics, onClickHandler],
  );

  return {
    ref,
    onClick,
  };
};
