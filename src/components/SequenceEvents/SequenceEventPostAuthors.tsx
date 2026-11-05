import { Fragment } from "react";
import type { SequenceEventPost } from "@/lib/sequences/sequenceEventQueries";
import { InteractionWrapper } from "@/lib/hooks/useClickableCell";
import UsersName from "../UsersName";
import Type from "../Type";

export default function SequenceEventPostAuthors({
  post: { user, coauthors },
}: Readonly<{
  post: SequenceEventPost;
}>) {
  return (
    <Type style="bodyHeavy" className="leading-[140%] tracking-[-0.01em]">
      <span className="font-[500]">by</span>{" "}
      <InteractionWrapper As="span">
        <UsersName user={user} tooltipPlacement="bottom-start" />
      </InteractionWrapper>
      {coauthors?.map((coauthor) => (
        <Fragment key={coauthor._id}>
          {", "}
          <InteractionWrapper As="span">
            <UsersName user={coauthor} tooltipPlacement="bottom-start" />
          </InteractionWrapper>
        </Fragment>
      ))}
    </Type>
  );
}
