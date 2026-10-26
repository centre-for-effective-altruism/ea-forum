## Quick Context

- App: EA Forum web application (Next.js 16, App Router)
- Language: TypeScript
- Runtime: Node.js (see `.nvmrc` for version)
- UI: React 19 + Tailwind CSS v4 (theme tokens in `src/app/globals.css`)
- Data: PostgreSQL via Drizzle ORM; tests use in-memory PGlite
- Error monitoring: Sentry and PostHog
- Architecture: Server Components for initial data, oRPC for client-triggered
  interactions
- This codebase is an ongoing migration; if expected behavior is ambiguous, ask
  rather than guess

Primary paths:

- App routes: `src/app/**`
- UI components: `src/components/**`
- Business logic / data access: `src/lib/**`
- Schema: `src/lib/schema.ts`
- DB client/relations: `src/lib/db.ts`
- RPC router root: `src/lib/router.ts`
- Tests: `tests/*.test.ts`
- Env contract: `ProcessEnv.d.ts`

## Commands and Required Checks

Local setup: `npm install` → configure `.env` from `ProcessEnv.d.ts` → `npm run dev`.

Common commands: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`,
`npm run test`

CI runs `lint`, `typecheck`, and `test`. Run those locally before substantial
handoffs.

Testing notes:

- Vitest (`vitest.config.mts`), Node environment, in-memory PGlite. `vitest.setup.ts`
  installs extensions, pushes schema, loads Postgres functions — keep tests
  deterministic and offline.
- For oRPC procedures, prefer direct tests via `call` from `@orpc/server` unless the
  HTTP transport is what's under test.
- Use the helpers in `test/testHelpers.ts` rather than adding custom helpers to test
  suites.

## Core Implementation Rules

Decision order when guidance conflicts:

1. Adjacent/local patterns in the same feature area.
2. This `AGENTS.md`.
3. General framework/library norms.

If `AGENTS.md` is stale or conflicts with repo reality, follow repo reality, call out
the mismatch, and update this file.

Pattern and style consistency:

- Match adjacent codebase patterns (file structure, naming, control flow, helpers);
  inspect nearby examples in `src/app/**`, `src/lib/**`, `src/components/**` first.
- Introduce a new pattern only with a clear benefit, and call out the deviation
  explicitly.
- Avoid duplicating UI metadata or configuration when one source of truth can drive
  both rendering and navigation (section lists, labels, visibility, ordering).
- Avoid leaving comments unless 100% needed, or if directly requested

Routes and the legacy proxy:

- New public-facing routes under `src/app/**` must be registered in
  `src/lib/proxy/legacySiteRedirect.ts` under `newSitePatterns`. Routes not in that list
  are proxied to the legacy v2 site, which won't have them and will 404. This failure
  mode is invisible to typecheck and lint.
- Use a strict regex anchored with `^` and `$` (e.g. `/^\/admin\/org-updates-test$/`)
  and add a brief trailing comment matching neighboring entries.
- The list is duplicated in the old repo `ForumMagnum`, and must also be updated there.

Utilities and abstractions:

- Prefer existing utilities (native APIs or already-used `lodash/*` modules) over
  one-off helpers; check `src/lib/utils/**`, adjacent feature utilities, and current
  `lodash/*` usage before adding new.
- Avoid premature shared abstractions; local code is often clearer until a second
  real caller exists. When a helper is warranted, place it at the narrowest sensible
  shared scope.

Frontend structure and conventions:

- Global theme tokens: `src/app/globals.css`
- `src/components/**` is scoped: generic reusable UI at the top level or generic
  subfolders, reusable domain UI in domain folders (`Comments/`, `Moderation/`),
- For new page UI, prefer theme-token classes (`bg-gray-0`, `text-gray-1000`,
  `border-gray-200`, `text-error`, `text-warning`) over hardcoded light-only surfaces
  like `bg-white`. Do a quick dark-mode pass before handoff so tables, cards,
  filters, and empty states remain readable.
- All user-facing text should be wrapped in a `Type` component to ensure font
  styles match the rest of the site.
- For async client data loads, default to visible loading and error states so
  failures are discoverable and not mistaken for empty results.
- Add new env vars to `ProcessEnv.d.ts` before reading them, so TypeScript validates
  the access.
- Do not import full `lodash` or `lodash/fp`; import specific modules.
- Do not import `next/link`; use `@/components/Link`.
- Import Zod from `zod/v4`, not `zod`.
- Prefer the Drizzle relational API (`db.query.*`) where practical.
- Use `clsx` for class composition and `@/*` path aliases.
- Avoid editing `src/vendor/**` unless explicitly required.

CkEditor

- The app uses a vendored version of CkEditor in `ckEditor/**`
- Avoid editing `ckEditor/**` unless explicitly required
- After editing `ckEditor/**`, you must run `npm run build` in the ckEditor directory
- The results of building should be commited

Types and naming:

- If a shared type changes purpose during a refactor, rename it rather than keeping a
  misleading historical name.
- Keep frontend-only helper types near the feature they support unless clearly shared
  across multiple feature areas.
- Avoid broad `as` casts at boundaries when a named type, transform, or validated
  contract can express the shape more clearly.

## Safety and Handoff Checklist

1. Never commit secrets or `.env` values.
2. Keep changes scoped to the requested task.
3. Run `lint`, `typecheck`, and relevant tests before handoff. If blocked by
   unrelated existing failures, say so explicitly and name the blocking file(s).
4. In final handoff, include patterns followed, intentional deviations and rationale,
   and validation results.
