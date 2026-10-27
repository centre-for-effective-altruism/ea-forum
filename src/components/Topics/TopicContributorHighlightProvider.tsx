"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TopicPageInteractionContext = {
  hoveredContributorId: string | null;
  setHoveredContributorId: (userId: string | null) => void;
  descriptionExpanded: boolean;
  expandDescription: (scrollToAnchor?: string) => void;
};

const topicPageInteractionContext =
  createContext<TopicPageInteractionContext | null>(null);

const contributorIdRegex = /^[A-Za-z0-9_-]+$/;

const scrollToAnchor = (anchor: string) =>
  document.getElementById(anchor)?.scrollIntoView({
    block: "start",
    behavior: "smooth",
  });

export default function TopicContributorHighlightProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [hoveredContributorId, setHoveredContributorId] = useState<string | null>(
    null,
  );
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const pendingAnchor = useRef<string | null>(null);

  const expandDescription = useCallback(
    (anchor?: string) => {
      if (descriptionExpanded) {
        if (anchor) {
          scrollToAnchor(anchor);
        }
        return;
      }
      pendingAnchor.current = anchor ?? null;
      setDescriptionExpanded(true);
    },
    [descriptionExpanded],
  );

  useEffect(() => {
    if (descriptionExpanded && pendingAnchor.current) {
      scrollToAnchor(pendingAnchor.current);
      pendingAnchor.current = null;
    }
  }, [descriptionExpanded]);

  const value = useMemo(
    () => ({
      hoveredContributorId,
      setHoveredContributorId,
      descriptionExpanded,
      expandDescription,
    }),
    [hoveredContributorId, descriptionExpanded, expandDescription],
  );

  return (
    <topicPageInteractionContext.Provider value={value}>
      {hoveredContributorId && contributorIdRegex.test(hoveredContributorId) && (
        <style>
          {`.by_${hoveredContributorId} { background-color: color-mix(in srgb, var(--color-primary) 25%, transparent); }`}
        </style>
      )}
      {children}
    </topicPageInteractionContext.Provider>
  );
}

const noop = () => {};

export const useTopicContributorHighlight = () => {
  const context = useContext(topicPageInteractionContext);
  return {
    hoveredContributorId: context?.hoveredContributorId ?? null,
    setHoveredContributorId: context?.setHoveredContributorId ?? noop,
  };
};

export const useTopicDescriptionExpansion = () => {
  const context = useContext(topicPageInteractionContext);
  const [localExpanded, setLocalExpanded] = useState(false);
  const expandLocally = useCallback(() => setLocalExpanded(true), []);
  return context
    ? { expanded: context.descriptionExpanded, expand: context.expandDescription }
    : { expanded: localExpanded, expand: expandLocally };
};
