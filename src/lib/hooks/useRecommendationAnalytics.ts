import { MouseEvent, useCallback } from "react";
import { useObserver } from "./useObserver";
import {
  clickRecommendationAction,
  observeRecommendationAction,
} from "../recommendations/recommendationActions";

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
      void observeRecommendationAction({ postId });
    }
  }, [postId, disableAnalytics]);

  const ref = useObserver<ObservedElement>({
    onEnter: onObserve,
    maxTriggers: 1,
  });

  const onClick = useCallback(
    (e: MouseEvent<ClickedElement>) => {
      if (!disableAnalytics) {
        void clickRecommendationAction({ postId });
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
