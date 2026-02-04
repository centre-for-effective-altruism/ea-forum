"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostReactors } from "@/lib/votes/fetchReactors";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import { useRecordPostView } from "@/lib/hooks/useRecordPostView";
import { useTracking } from "@/lib/analyticsEvents";
import { useVote, UseVoteResult } from "@/components/Voting/useVote";

type PostDisplayContext = {
  post: PostDisplay;
  vote: UseVoteResult;
  reactors: PostReactors;
  showAudio: boolean;
  toggleShowAudio: () => void;
};

const postDisplayContext = createContext<PostDisplayContext | null>(null);

const audioCookie = "show_post_podcast_player";

export const PostDisplayProvider: FC<{
  post: PostDisplay;
  reactors: PostReactors;
  children: ReactNode;
}> = ({ post, reactors, children }) => {
  const { captureEvent } = useTracking();
  const { recordPostView } = useRecordPostView(post);
  const [cookies, setCookie] = useCookiesWithConsent([audioCookie]);
  const [showAudio, setShowAudio] = useState(cookies[audioCookie] === "true");
  const vote = useVote({ collectionName: "Posts", document: post });

  const toggleShowAudio = useCallback(() => {
    setShowAudio((value) => {
      const newValue = !value;
      setCookie(audioCookie, String(newValue), { path: "/" });
      captureEvent("toggleAudioPlayer", { action: newValue ? "open" : "close" });
      return newValue;
    });
  }, [setCookie, captureEvent]);

  useEffect(() => {
    void recordPostView({
      post: post,
      extraEventProperties: {
        // TODO: Set sequence ID if viewing from the sequences UI
        sequenceId: null,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <postDisplayContext.Provider
      value={{ post, vote, reactors, showAudio, toggleShowAudio }}
    >
      {children}
    </postDisplayContext.Provider>
  );
};

export const usePostDisplay = () => {
  const context = useContext(postDisplayContext);
  if (!context) {
    throw new Error("No post display context");
  }
  return context;
};
