/* eslint-disable no-console */
import * as readline from 'readline'
import {
  createWorld,
  currentState,
  execute,
  createUser,
  editUser,
  createPost,
  editPost,
  viewPost,
  reviewUser,
  undo,
  redo,
  User,
  Post,
  POST_FIELDS,
  USER_FIELDS,
  PostStatus,
} from './fm-lite'

// =============================================================================
// Types
// =============================================================================

type Actor =
  | { type: 'god' | 'admin' | 'mod' | 'member' | 'logged-out' }
  | { type: 'user'; userId: string }

// =============================================================================
// UNSTABLE warnings for commands not yet 1-1 with ForumMagnum
// =============================================================================

const UNSTABLE: Record<string, string> = {
  'create user': 'No permission checks, no TOS acceptance',
  'edit user': 'No permission checks',
  'create post': 'No permission checks',
  'edit post': 'No permission checks',
  'review user': 'No permission checks (should be mod/admin only), rejection not implemented',
}

const warnUnstable = (cmd: string): void => {
  if (UNSTABLE[cmd]) {
    console.log(`UNSTABLE: ${UNSTABLE[cmd]}`)
  }
}

// =============================================================================
// Session
// =============================================================================

const world = createWorld()

// =============================================================================
// Parsing
// =============================================================================

const parseActor = (str: string): Actor | null => {
  const s = str.trim().toLowerCase()
  if (s === 'god' || s === 'admin' || s === 'mod' || s === 'member' || s === 'logged-out') {
    return { type: s }
  }
  if (s.startsWith('user ')) {
    const userId = str.trim().slice(5).trim()
    return userId ? { type: 'user', userId } : null
  }
  return null
}

const parseFlags = (args: string[]): Record<string, string> => {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1]
      i++
    }
  }
  return flags
}

/** Fields that are arrays (comma-separated in CLI) */
const ARRAY_FIELDS = ['bannedUserIds']

const applyFlags = <T extends string>(
  flags: Record<string, string>,
  validFields: readonly T[]
): { changes: Record<string, unknown>; unused: string[] } => {
  const changes: Record<string, unknown> = {}
  const unused: string[] = []
  for (const [key, value] of Object.entries(flags)) {
    if (validFields.includes(key as T)) {
      // Parse value based on type
      if (ARRAY_FIELDS.includes(key)) {
        changes[key] = value ? value.split(',').map((s) => s.trim()) : []
      } else if (value === 'true') changes[key] = true
      else if (value === 'false') changes[key] = false
      else if (/^\d+$/.test(value)) changes[key] = parseInt(value, 10)
      else changes[key] = value
    } else {
      unused.push(key)
    }
  }
  return { changes, unused }
}

/** Get the effective viewer ID for an actor */
const getViewerId = (actor: Actor): string | null => {
  if (actor.type === 'logged-out') return null
  if (actor.type === 'user') return actor.userId
  // Magic roles: we need to look up or create a virtual user
  // For now, return a magic ID that we'll handle specially
  return `__${actor.type}__`
}

// =============================================================================
// Commands
// =============================================================================

const run = (line: string): void => {
  const trimmed = line.trim()
  if (!trimmed) return

  // Commands without actor
  if (trimmed === 'undo') return void (undo(world) ? console.log('Undone') : console.log('Nothing to undo'))
  if (trimmed === 'redo') return void (redo(world) ? console.log('Redone') : console.log('Nothing to redo'))
  if (trimmed === 'users') {
    const state = currentState(world)
    if (state.users.size === 0) return void console.log('No users')
    for (const [id, u] of state.users) {
      const reviewed = u.reviewedByUserId ? `reviewed by ${u.reviewedByUserId}` : 'unreviewed'
      console.log(`  ${id}: isAdmin=${u.isAdmin}, isMod=${u.isMod}, karma=${u.karma}, ${reviewed}`)
    }
    return
  }
  if (trimmed === 'posts') {
    const state = currentState(world)
    if (state.posts.size === 0) return void console.log('No posts')
    for (const [id, p] of state.posts) {
      console.log(`  ${id}: author=${p.authorId}, status=${p.status}, draft=${p.draft}`)
    }
    return
  }
  if (trimmed === 'help') {
    console.log(`
Commands:
  as <actor>: create user <userId>
  as <actor>: edit user <userId> --isAdmin true/false --isMod true/false --karma <n>
  as <actor>: view user <userId>
  as <actor>: review user <userId> --approve true
  as <actor>: create post <postId> --authorId <userId> [--draft false --status 2 ...]
  as <actor>: edit post <postId> [--draft false --status 2 ...]
  as <actor>: view post <postId>

Shortcuts: users | posts | undo | redo | help

Actors:
  god        - DB/dev access, bypasses all checks
  admin      - isAdmin=true user
  mod        - isMod=true user (sunshineRegiment)
  member     - Regular logged-in user
  logged-out - No user world
  user <id>  - Specific user by ID

User fields: ${USER_FIELDS.join(', ')}
Post fields: ${POST_FIELDS.join(', ')}
Post status: 1=pending (unused), 2=approved, 3=rejected, 4=spam, 5=deleted`)
    return
  }

  // Parse "as <actor>: <command>"
  const match = trimmed.match(/^as\s+(.+?):\s*(.+)$/i)
  if (!match) return void console.log('Unknown command. Type "help" for usage.')

  const actor = parseActor(match[1])
  if (!actor) return void console.log(`Unknown actor: '${match[1]}'`)

  const state = currentState(world)
  const args = match[2].split(/\s+/)
  const [cmd, target, id] = args

  // CREATE USER
  if (cmd === 'create' && target === 'user') {
    if (!id) return void console.log('Usage: create user <userId>')
    warnUnstable('create user')
    const { unused } = applyFlags(parseFlags(args.slice(3)), USER_FIELDS)
    if (unused.length) console.log(`Warning: unused flags: ${unused.map((f) => '--' + f).join(', ')}`)
    const result = createUser(id, state)
    if (!result.ok) return void console.log(`FAILED: ${result.reason}`)
    execute(world, result)
    console.log(`Created user '${id}'`)
  }
  // EDIT USER
  else if (cmd === 'edit' && target === 'user') {
    if (!id) return void console.log('Usage: edit user <userId> --isAdmin true/false --isMod true/false')
    warnUnstable('edit user')
    const { changes, unused } = applyFlags(parseFlags(args.slice(3)), USER_FIELDS)
    if (unused.length) console.log(`Warning: unused flags: ${unused.map((f) => '--' + f).join(', ')}`)
    const result = editUser(id, changes as Partial<Omit<User, 'id'>>, state)
    if (!result.ok) return void console.log(`FAILED: ${result.reason}`)
    execute(world, result)
    console.log(`Updated user '${id}'`)
  }
  // VIEW USER
  else if (cmd === 'view' && target === 'user') {
    if (!id) return void console.log('Usage: view user <userId>')
    const user = state.users.get(id)
    if (!user) return void console.log(`User '${id}' not found`)
    const reviewed = user.reviewedByUserId ? `reviewed by ${user.reviewedByUserId}` : 'unreviewed'
    console.log(`${user.id}: isAdmin=${user.isAdmin}, isMod=${user.isMod}, karma=${user.karma}, ${reviewed}`)
  }
  // REVIEW USER
  else if (cmd === 'review' && target === 'user') {
    if (!id) return void console.log('Usage: review user <userId> --approve true')
    warnUnstable('review user')
    const flags = parseFlags(args.slice(3))
    if (flags.approve !== 'true') {
      return void console.log('FAILED: --approve true is required (rejection not yet implemented)')
    }
    // Use actor as reviewer - for god/admin/mod, use magic ID; for user, use their ID
    const reviewerId = actor.type === 'user' ? actor.userId : `__${actor.type}__`
    const result = reviewUser(id, reviewerId, state)
    if (!result.ok) return void console.log(`FAILED: ${result.reason}`)
    execute(world, result)
    console.log(`Approved user '${id}' (${result.events.length - 1} posts updated)`)
  }
  // CREATE POST
  else if (cmd === 'create' && target === 'post') {
    if (!id) return void console.log('Usage: create post <postId> --authorId <userId>')
    warnUnstable('create post')
    const flags = parseFlags(args.slice(3))
    const authorId = flags.authorId
    delete flags.authorId
    if (!authorId) return void console.log('FAILED: --authorId is required')
    const { changes, unused } = applyFlags(flags, POST_FIELDS)
    if (unused.length) console.log(`Warning: unused flags: ${unused.map((f) => '--' + f).join(', ')}`)
    const result = createPost(id, authorId, state)
    if (!result.ok) return void console.log(`FAILED: ${result.reason}`)
    execute(world, result)
    // Apply any initial field changes
    if (Object.keys(changes).length > 0) {
      const editResult = editPost(id, changes as Partial<Omit<Post, 'id' | 'authorId'>>, currentState(world))
      if (editResult.ok) execute(world, editResult)
    }
    console.log(`Created post '${id}' by '${authorId}'`)
  }
  // EDIT POST
  else if (cmd === 'edit' && target === 'post') {
    if (!id) return void console.log('Usage: edit post <postId> --draft false --status 2 ...')
    warnUnstable('edit post')
    const { changes, unused } = applyFlags(parseFlags(args.slice(3)), POST_FIELDS)
    if (unused.length) console.log(`Warning: unused flags: ${unused.map((f) => '--' + f).join(', ')}`)
    const result = editPost(id, changes as Partial<Omit<Post, 'id' | 'authorId'>>, state)
    if (!result.ok) return void console.log(`FAILED: ${result.reason}`)
    execute(world, result)
    console.log(`Updated post '${id}'`)
  }
  // VIEW POST
  else if (cmd === 'view' && target === 'post') {
    if (!id) return void console.log('Usage: view post <postId>')
    warnUnstable('view post')

    // Resolve actor to viewer context
    let viewerId = getViewerId(actor)
    let viewerForCheck = viewerId

    // For magic roles, create a virtual check
    if (actor.type === 'god') {
      // God sees everything - just show the post
      const post = state.posts.get(id)
      if (!post) return void console.log(`Post '${id}' not found`)
      console.log(`[GOD VIEW] ${post.id}: author=${post.authorId}, status=${post.status}, draft=${post.draft}`)
      console.log(`  All fields: ${JSON.stringify(post, null, 2)}`)
      return
    }

    // For admin/mod/member magic roles, we need a user with those properties
    if (actor.type === 'admin' || actor.type === 'mod' || actor.type === 'member') {
      // Check if magic user exists, describe what we're simulating
      const magicUser = state.users.get(viewerId!)
      if (!magicUser) {
        console.log(`Note: Using virtual ${actor.type} user (not in state)`)
        // For the check, we need to handle this specially
        // Create a temporary state with the magic user
        const tempState = {
          ...state,
          users: new Map(state.users).set(viewerId!, {
            id: viewerId!,
            isAdmin: actor.type === 'admin',
            isMod: actor.type === 'mod',
            karma: 1000, // Magic users have high karma
            reviewedByUserId: '__system__', // Magic users are considered reviewed
          }),
        }
        const result = viewPost(viewerId, id, tempState)
        if (!result.canView) {
          console.log(`Cannot view: ${result.reason}`)
        } else {
          const p = result.post!
          console.log(`${p.id}: author=${p.authorId}, status=${p.status}, draft=${p.draft}`)
        }
        return
      }
    }

    const result = viewPost(viewerForCheck, id, state)
    if (!result.canView) {
      console.log(`Cannot view: ${result.reason}`)
    } else {
      const p = result.post!
      console.log(`${p.id}: author=${p.authorId}, status=${p.status}, draft=${p.draft}`)
    }
  }
  // UNKNOWN
  else {
    console.log(`Unknown command: '${match[2]}'`)
  }
}

// =============================================================================
// REPL
// =============================================================================

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.setPrompt('> ')
rl.prompt()
rl.on('line', (line) => {
  try {
    run(line)
  } catch (err) {
    console.log(`Error: ${err instanceof Error ? err.message : err}`)
  }
  rl.prompt()
})
rl.on('close', () => process.exit(0))
