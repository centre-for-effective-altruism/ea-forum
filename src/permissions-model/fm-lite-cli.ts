/* eslint-disable no-console */
import * as readline from "readline";
import {
  applyAction,
  parseAction,
  initialState,
  viewPost,
  viewComment,
  ActionParamsSchemas,
  State,
  USER_FIELDS,
  POST_FIELDS,
  COMMENT_FIELDS,
} from "./fm-lite";

// =============================================================================
// Session State
// =============================================================================

let state: State = initialState();

// =============================================================================
// Parsing
// =============================================================================

/** Parse --key value pairs from args into an object */
const parseFlags = (args: string[]): Record<string, unknown> => {
  const flags: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      // Parse value types
      if (value === "true") flags[key] = true;
      else if (value === "false") flags[key] = false;
      else if (/^\d+$/.test(value)) flags[key] = parseInt(value, 10);
      else if (/^\d{4}-\d{2}-\d{2}/.test(value)) flags[key] = new Date(value);
      else if (value.includes(","))
        flags[key] = value.split(",").map((s) => s.trim());
      else flags[key] = value;
      i++;
    }
  }
  return flags;
};

/** Convert "create user" to "CREATE_USER" */
const toActionType = (words: string[]): string => {
  return words.join("_").toUpperCase();
};

// =============================================================================
// Commands
// =============================================================================

const showHelp = (): void => {
  const actionTypes = Object.keys(ActionParamsSchemas).join(", ");
  console.log(`
Commands:
  as <actor>: <verb> <noun> --param value ...

Examples:
  as god: create user --userId alice
  as alice: create post --postId p1
  as alice: update post --postId p1 --draft false
  as god: update user --userId alice --karma 100
  as bob: view post --postId p1
  as bob: view comment --commentId c1

State commands:
  state           - Show current state summary
  reset           - Reset to initial state
  help            - Show this help

Action types: ${actionTypes}

User fields: ${USER_FIELDS.join(", ")}
Post fields: ${POST_FIELDS.join(", ")}
Comment fields: ${COMMENT_FIELDS.join(", ")}
`);
};

const showState = (): void => {
  console.log(`Users (${state.users.size}):`);
  for (const [id, u] of state.users) {
    const reviewed = u.reviewedByUserId
      ? `reviewed by ${u.reviewedByUserId}`
      : "unreviewed";
    console.log(
      `  ${id}: admin=${u.isAdmin}, mod=${u.isMod}, karma=${u.karma}, ${reviewed}`,
    );
  }
  console.log(`Posts (${state.posts.size}):`);
  for (const [id, p] of state.posts) {
    console.log(
      `  ${id}: author=${p.authorId}, status=${p.status}, draft=${p.draft}`,
    );
  }
  console.log(`Comments (${state.comments.size}):`);
  for (const [id, c] of state.comments) {
    console.log(
      `  ${id}: author=${c.authorId}, post=${c.postId}, draft=${c.draft}, deleted=${c.deleted}`,
    );
  }
};

const run = (line: string): void => {
  const trimmed = line.trim();
  if (!trimmed) return;

  // Simple commands
  if (trimmed === "help") return showHelp();
  if (trimmed === "state") return showState();
  if (trimmed === "reset") {
    state = initialState();
    return void console.log("State reset");
  }

  // Parse "as <actor>: <command>"
  const match = trimmed.match(/^as\s+(.+?):\s*(.+)$/i);
  if (!match) {
    return void console.log(
      'Unknown command. Use "as <actor>: <command>" or type "help"',
    );
  }

  const actor = match[1].trim();
  const rest = match[2].trim();
  const args = rest.split(/\s+/);

  // Handle view commands specially (they don't modify state)
  if (args[0] === "view") {
    const target = args[1];
    const flags = parseFlags(args.slice(2));

    if (target === "post") {
      const postId = flags.postId as string;
      if (!postId) return void console.log("Usage: view post --postId <id>");
      const result = viewPost(actor === "logged-out" ? null : actor, state, {
        postId,
      });
      if (!result.canView) {
        console.log(`Cannot view: ${result.reason}`);
      } else {
        const p = result.post!;
        console.log(`Post ${p.id}:`);
        console.log(`  author: ${p.authorId}`);
        console.log(`  status: ${p.status}, draft: ${p.draft}`);
        console.log(`  authorIsUnreviewed: ${p.authorIsUnreviewed}`);
      }
      return;
    }

    if (target === "comment") {
      const commentId = flags.commentId as string;
      if (!commentId)
        return void console.log("Usage: view comment --commentId <id>");
      const result = viewComment(actor === "logged-out" ? null : actor, state, {
        commentId,
      });
      if (!result.canView) {
        console.log(`Cannot view: ${result.reason}`);
      } else {
        const c = result.comment!;
        console.log(`Comment ${c.id}:`);
        console.log(`  author: ${c.authorId}, post: ${c.postId}`);
        console.log(
          `  viewMode: ${result.viewMode}, canReadContents: ${result.canReadContents}`,
        );
        if (result.canReadContents) {
          console.log(`  contents: ${c.contents}`);
        }
      }
      return;
    }

    return void console.log(`Unknown view target: ${target}`);
  }

  // Find where flags start (first --arg)
  const flagStart = args.findIndex((a) => a.startsWith("--"));
  const commandWords = flagStart === -1 ? args : args.slice(0, flagStart);
  const flagArgs = flagStart === -1 ? [] : args.slice(flagStart);

  // Convert command words to action type
  const actionTypeStr = toActionType(commandWords);

  // Parse flags into params
  const params = parseFlags(flagArgs);

  // For update actions, wrap non-id fields in a changes object
  if (actionTypeStr.startsWith("UPDATE_")) {
    const idField =
      actionTypeStr === "UPDATE_USER"
        ? "userId"
        : actionTypeStr === "UPDATE_POST"
          ? "postId"
          : "commentId";
    const idValue = params[idField];
    delete params[idField];
    const changes = { ...params };
    // Clear params and rebuild with id + changes
    for (const key of Object.keys(params)) delete params[key];
    params[idField] = idValue;
    params.changes = changes;
  }

  // Parse and validate the action
  const parseResult = parseAction(actionTypeStr, actor, params);
  if (!parseResult.ok) {
    return void console.log(
      `Invalid action: ${"error" in parseResult ? parseResult.error : "unknown error"}`,
    );
  }

  // Apply the action
  const result = applyAction(state, parseResult.action);
  if (!result.ok) {
    return void console.log(`FAILED: ${result.reason}`);
  }

  state = result.state;
  console.log(`OK: ${actionTypeStr}`);
};

// =============================================================================
// REPL
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.setPrompt("> ");
rl.prompt();
rl.on("line", (line) => {
  try {
    run(line);
  } catch (err) {
    console.log(`Error: ${err instanceof Error ? err.message : err}`);
  }
  rl.prompt();
});
rl.on("close", () => process.exit(0));
