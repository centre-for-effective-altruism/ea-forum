"use client";

import type {
  ConversationMessage,
  InboxConversation,
} from "@/lib/messages/conversationQueries";
import { useMessageEditor } from "@/lib/hooks/useMessageEditor";
import Editor from "../Editor/Editor";
import Checkbox from "../Forms/Checkbox";
import Button from "../Button";

export default function MessageForm({
  conversation,
  htmlTemplate,
  from,
  onSuccess,
}: Readonly<{
  conversation: InboxConversation;
  htmlTemplate?: string;
  from?: string;
  onSuccess: (message: ConversationMessage | null) => void;
}>) {
  const {
    contents,
    editorRef,
    loading,
    noEmail,
    setNoEmail,
    showNoEmail,
    onChange,
    onSubmit,
    onKeyDown,
    autosave,
  } = useMessageEditor({ conversation, htmlTemplate, from, onSuccess });
  return (
    <form
      data-component="MessageForm"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className="
        flex flex-col gap-2 border border-gray-200 bg-gray-100 rounded p-2
        [&_.ck.ck-content]:min-h-[60px]
      "
    >
      <Editor
        formType="new"
        collectionName="Messages"
        fieldName="contents"
        placeholder="Type a new message..."
        value={contents}
        onChange={onChange}
        autosave={autosave}
        commentStyles
        commentEditor
        hideControls
        ref={editorRef}
        className="w-full"
      />
      <div className="flex items-center justify-end gap-3">
        {showNoEmail && (
          <Checkbox
            label={{ id: `no-email-${conversation._id}`, text: "No email" }}
            checked={noEmail}
            onChange={setNoEmail}
          />
        )}
        <Button type="submit" loading={loading}>
          Send
        </Button>
      </div>
    </form>
  );
}
