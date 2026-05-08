# AGENTS.md

Project-specific playbook for coding agents working in this repository.

## Quick Context

- App: EA Forum web application (Next.js 16, App Router).
- Language: TypeScript (`strict` mode).
- Runtime: Node.js `>=22.12.0`.
- UI: React 19 + Tailwind CSS v4 (theme tokens in `src/app/globals.css`).
- Data: PostgreSQL via Drizzle ORM; tests use in-memory PGlite.
- Error monitoring: Sentry (`next.config.ts`, `sentry.*.config.ts`).
- Architecture: Server Components for initial data, oRPC for client-triggered
  interactions, feature-local frontend composition.
- This codebase is an ongoing migration; if expected behavior is ambiguous, ask
  rather than guess.

Primary paths:

- App routes: `src/app/**`
- UI components: `src/components/**`
- Business logic / data access: `src/lib/**`
- Schema: `src/lib/schema.ts`
- DB client/relations: `src/lib/db.ts`
- RPC router root: `src/lib/router.ts`
- RPC client: `src/lib/rpc.ts`
- RPC transport entrypoint: `src/app/rpc/[[...rest]]/route.ts`
- API handler helpers: `src/lib/requestHandler.ts`
- Tests: `tests/*.test.ts`
- Env contract: `ProcessEnv.d.ts`

## Commands and Required Checks

Local setup: `npm install` → configure `.env` from `ProcessEnv.d.ts` → `npm run dev`.

Common commands: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`,
`npm run test`. (`format` / `check-format` exist; CI does not run them.)

CI runs `lint`, `typecheck`, and `test`. Run those locally before substantial
handoffs.

Testing notes:

- Vitest (`vitest.config.mts`), Node environment, in-memory PGlite. `vitest.setup.ts`
  installs extensions, pushes schema, loads Postgres functions — keep tests
  deterministic and offline.
- For oRPC procedures, prefer direct tests via `call` from `@orpc/server` unless the
  HTTP transport is what's under test.

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

Server boundaries and data access:

- Default order for data access: direct server calls for initial Server Component
  render, oRPC for client-triggered interactions, `app/api/**` only for
  external/public consumers or strong local precedent.
- For client-triggered server reads/writes, use oRPC routers via
  `os.input(...).handler(...)` under `src/lib/*Router.ts`, register them in
  `src/lib/router.ts`, and call them from the client via `rpc` in `src/lib/rpc.ts`.
- Use `getCurrentUser()` (`src/lib/users/currentUser.ts`) for auth context.
- Admin pages live under `src/app/admin/**` and inherit the `notFound()` gate from
  `src/app/admin/layout.tsx`. New admin `page.tsx` files should rely on that
  inherited check rather than re-asserting `currentUser?.isAdmin` per page;
  duplicated checks tend to drift.
- Enforce auth and permission checks at the server boundary (oRPC handlers, route
  handlers, server actions), not via client visibility. Apply least-privilege per
  read/write path.
- Treat the input schemas of oRPC handlers (`os.input(schema)`) and `ApiRoute`
  endpoints with `access: "all"` as public, unauthenticated contracts. Widening or
  adding a field there is a public API change: apply bounded zod constraints
  (`.max()`, `.min()`, enum literals) to all user-controllable inputs (pagination,
  filters, IDs), and avoid leaking internal identifiers that aren't already publicly
  observable.
- For transactional mutations, use `db.transaction` and pass transaction objects
  through helper layers (`DbOrTransaction` in `src/lib/db.ts`).
- Avoid duplicated logic across parallel server paths that must stay consistent (row
  queries vs count queries, initial server payloads vs client paging state). Prefer a
  shared source of truth or keep the duplication tightly localized and obvious.
- If you intentionally deviate from these defaults, explain why before
  implementation.

Routes and the legacy proxy:

- New public-facing routes under `src/app/**` must be registered in
  `src/lib/legacySiteRedirect.ts` under `newSitePatterns`. Routes not in that list
  are proxied to the legacy v2 site, which won't have them and will 404. This failure
  mode is invisible to typecheck and lint.
- Use a strict regex anchored with `^` and `$` (e.g. `/^\/admin\/org-updates-test$/`)
  and add a brief trailing comment matching neighboring entries.
- The owned-routes payload is shipped to the legacy site as a cookie; the file has a
  static check that throws in dev if `newSitePatterns` approaches the 4KB limit. If
  it fires, prune or group patterns rather than relaxing the threshold.

Utilities and abstractions:

- Prefer existing utilities (native APIs or already-used `lodash/*` modules) over
  one-off helpers; check `src/lib/utils/**`, adjacent feature utilities, and current
  `lodash/*` usage before adding new.
- Avoid premature shared abstractions; local code is often clearer until a second
  real caller exists. When a helper is warranted, place it at the narrowest sensible
  shared scope.

Frontend structure and conventions:

- Global theme tokens: `src/app/globals.css`; fonts: `src/app/layout.tsx`.
- `src/components/**` is scoped: generic reusable UI at the top level or generic
  subfolders, reusable domain UI in domain folders (`Comments/`, `Moderation/`),
  route/page-specific composition in `*Page/` folders (`ModerationPage/`).
- Promote a page-specific component into a domain folder only after a second real
  caller appears.
- When a page or client component grows large, split it into a small shell, a local
  hook for state/loading, and nearby section/subcomponents.
- For large payloads passed from Server Components to client components, prefer a
  named contract type (e.g. `*InitialData`) over inline prop shapes.
- For new page UI, prefer theme-token classes (`bg-gray-0`, `text-gray-1000`,
  `border-gray-200`, `text-error`, `text-warning`) over hardcoded light-only surfaces
  like `bg-white`. Do a quick dark-mode pass before handoff so tables, cards,
  filters, and empty states remain readable.
- For async client data loads, default to visible loading and error states so
  failures are discoverable and not mistaken for empty results.

Hard rules (lint-evadable, easy to miss):

- `page.tsx` and `layout.tsx` files under `src/app/**` are React Server Components by
  default; no client hooks (`useState`, `useEffect`, `useRef`, `useContext`) without
  `"use client"`.
- Add new env vars to `ProcessEnv.d.ts` before reading them, so TypeScript validates
  the access.
- No floating promises.
- No `console.log` (use `console.warn` / `console.error`).
- Do not import full `lodash` or `lodash/fp`; import specific modules.
- Do not import `next/link`; use `@/components/Link`.
- Use `<Type style="...">` from `@/components/Type` for headings/labeled text rather
  than raw `<h1>` / `<h2>`.
- Import Zod from `zod/v4`, not `zod`.
- Prefer the Drizzle relational API (`db.query.*`) where practical.
- Use `clsx` for class composition and `@/*` path aliases.
- Avoid editing `src/vendor/**` and `ckEditor/**` unless explicitly required.

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
3. If adding env vars, update `ProcessEnv.d.ts` and document usage.
4. Run `lint`, `typecheck`, and relevant tests before handoff. If blocked by
   unrelated existing failures, say so explicitly and name the blocking file(s).
5. In final handoff, include patterns followed, intentional deviations and rationale,
   and validation results.
