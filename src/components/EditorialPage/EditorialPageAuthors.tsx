import { Fragment } from "react";
import type { EditorialPagePost } from "@/lib/sequences/editorialPageContentQueries";
import { InteractionWrapper } from "@/lib/hooks/useClickableCell";
import UsersName from "../UsersName";
import Type from "../Type";

export default function EditorialPageAuthors({
  post,
  byClassName,
}: Readonly<{
  post: EditorialPagePost;
  /** The list rows set the word "by" a little lighter than the names */
  byClassName?: string;
}>) {
  return (
    <Type style="editorialPageAuthors">
      <span className={byClassName}>by</span>{" "}
      <InteractionWrapper className="inline">
        <UsersName user={post.user} tooltipPlacement="bottom-start" />
      </InteractionWrapper>
      {post.coauthors?.map((user) => (
        <Fragment key={user._id}>
          {", "}
          <InteractionWrapper className="inline">
            <UsersName user={user} tooltipPlacement="bottom-start" />
          </InteractionWrapper>
        </Fragment>
      ))}
    </Type>
  );
}
