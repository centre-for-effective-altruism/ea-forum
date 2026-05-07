# AGENTS.md

Project-specific playbook for coding agents working in this repository.

## Quick Context

- App: EA Forum web application (Next.js App Router).
- Language: TypeScript (`strict` mode).
- Runtime: Node.js `>=22.12.0`.
- UI: React 19 + Tailwind CSS v4 (theme variables in `src/app/globals.css`).
- Data: PostgreSQL via Drizzle ORM; tests use in-memory PGlite.
- Error monitoring: Sentry (`next.config.ts`, `sentry.*.config.ts`).
- Default architecture: Server Components for initial data, oRPC for client-triggered
  interactions, and feature-local frontend composition.
- This codebase is an ongoing migration; if expected behavior is ambiguous, ask
  rather than guessing.

Primary paths:

- App routes: `src/app/**`
- UI components: `src/components/**`
- Business logic/data access: `src/lib/**`
- Schema: `src/lib/schema.ts`
- DB client/relations: `src/lib/db.ts`
- RPC router root: `src/lib/router.ts`
- RPC client: `src/lib/rpc.ts`
- RPC transport entrypoint: `src/app/rpc/[[...rest]]/route.ts`
- API handler helpers: `src/lib/requestHandler.ts`
- Tests: `tests/*.test.ts`
- Env contract: `ProcessEnv.d.ts`

## Commands and Required Checks

Local setup:

1. `npm install`
2. Configure `.env` from `ProcessEnv.d.ts`
3. `npm run dev`

Useful commands:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test -- --run`
- `npm run check-format`
- `npm run format`

CI parity:

- CI runs `lint`, `typecheck`, and `test`.
- Before finishing substantial changes, run at least those same checks locally.

Testing notes:

- Vitest (`vitest.config.mts`), Node environment, in-memory PGlite.
- `vitest.setup.ts` installs extensions, pushes schema, and loads Postgres functions,
  so keep tests deterministic and avoid network dependency.
- For oRPC procedures, prefer direct tests with `call` from `@orpc/server` unless the
  HTTP transport layer itself is what you are testing.

## Core Implementation Rules

Decision order when guidance conflicts:

1. Follow adjacent/local patterns in the same feature area.
2. Then follow this `AGENTS.md`.
3. Then fall back to general framework/library norms.

If `AGENTS.md` appears stale or conflicts with the current codebase architecture,
follow repo reality, call out the mismatch explicitly, and update `AGENTS.md`.

Pattern and style consistency:

- Prefer established codebase patterns over new architectural styles.
- Inspect nearby canonical examples in `src/app/**`, `src/lib/**`, and
  `src/components/**` before implementing.
- Keep diffs as small as practical unless broader refactor is explicitly needed.
- Prioritize matching existing local code style (file structure, naming, type
  placement, helper patterns, and control flow), because consistency improves
  readability and maintainability for future contributors.
- Introduce a new style or pattern only when there is a clear benefit, and explicitly
  call out that deviation.
- Avoid duplicating UI metadata or configuration in multiple places when one source
  of truth can drive both rendering and navigation (for example section lists,
  labels, visibility, or ordering).

Server boundaries and data access:

- Prefer Server Components for data loading when practical.
- Default order for data access: direct server calls for initial Server Component
  render, oRPC for client-triggered interactions, `app/api/**` only for
  external/public consumers or strong local precedent.
- For client-triggered server reads/writes, default to oRPC routers using
  `os.input(...).handler(...)` under `src/lib/*Router.ts`, register them in
  `src/lib/router.ts`, and call them from the client via `rpc` in `src/lib/rpc.ts`.
- Use `getCurrentUser()` (`src/lib/users/currentUser.ts`) for auth context.
- Admin pages live under `src/app/admin/**` and inherit the `notFound()` gate
  from `src/app/admin/layout.tsx`. New admin `page.tsx` files should rely on
  that inherited check rather than re-asserting `currentUser?.isAdmin` per page;
  duplicated checks tend to drift.
- For oRPC procedures, enforce auth and permission checks inside the handler rather
  than relying on client visibility or route-handler wrappers.
- Treat the input schemas of oRPC handlers (`os.input(schema)`) and `ApiRoute`
  endpoints with `access: "all"` as public, unauthenticated contracts. Widening
  or adding a field there is effectively a public API change: apply bounded zod
  constraints (`.max()`, `.min()`, enum literals) to anything user-controllable
  to limit DoS amplification, and avoid leaking internal IDs unless they're
  already publicly observable.
- Enforce authorization at the server boundary (actions/routes), not just in UI
  visibility checks, so data access remains protected regardless of client code.
- Apply least-privilege checks for each new read/write path.
- For transactional mutations, use `db.transaction` and pass transaction objects
  through helper layers (`DbOrTransaction` in `src/lib/db.ts`).
- Avoid duplicated logic across parallel paths that must stay consistent (for example
  row queries vs count queries, navigation metadata vs rendered sections, or initial
  server payloads vs client paging state). Prefer a shared source of truth or keep
  the duplication tightly localized and obvious.
- If you intentionally deviate from these defaults, explain why before
  implementation.

Routes and the legacy proxy:

- New public-facing routes under `src/app/**` must be registered in
  `src/lib/legacySiteRedirect.ts` under `newSitePatterns`. Routes not in that
  list are proxied to the legacy v2 site, which won't have them and will 404.
  This failure mode is invisible to typecheck and lint.
- Use a strict regex anchored with `^` and `$` (for example
  `/^\/admin\/org-updates-test$/`) and add a brief trailing comment matching
  neighboring entries.
- The owned-routes payload is shipped to the legacy site as a cookie; the file
  has a static check that throws in dev if `newSitePatterns` approaches the 4KB
  cookie limit. If the check fires, prune or group patterns rather than
  relaxing the threshold.

Utilities and abstractions:

- Prefer existing utilities (native APIs or already-used `lodash/*` utilities) over
  one-off helpers.
- Before adding a helper, check `src/lib/utils/**`, adjacent feature utilities, and
  current `lodash/*` usage patterns.
- Avoid premature shared abstractions; local code is often clearer until a second
  real caller exists.
- When a helper is warranted, place it at the narrowest sensible shared scope and
  avoid duplicating equivalent transforms.

Frontend structure and conventions:

- Global theme tokens: `src/app/globals.css`; fonts: `src/app/layout.tsx`.
- Favor existing component patterns before introducing new abstractions.
- Structure `src/components/**` by scope: keep generic reusable UI at the top level
  or in generic subfolders, keep reusable domain UI in domain folders like
  `Comments/` or `Moderation/`, and keep route/page-specific composition in `*Page/`
  folders like `ModerationPage/`.
- Promote a page-specific component into a reusable domain folder only after a second
  real caller appears.
- When refactoring for structure or readability, preserve behavior unless the user
  explicitly asks for a behavior change.
- When a page or client component becomes large, prefer splitting it into a small
  shell component, a local hook for state/loading logic, and nearby
  section/subcomponents for rendering rather than keeping one monolithic file.
- For large payloads passed from Server Components to client components, prefer a
  named contract type (for example `*InitialData`) over large inline prop shapes.
- Match local UX/state patterns in the feature area.
- For new page UI, prefer theme-token classes like `bg-gray-0`, `text-gray-1000`,
  `border-gray-200`, `text-error`, and `text-warning` over hardcoded light-only
  surfaces such as `bg-white`.
- When adding or restyling page-local UI, do a quick dark-mode pass before handoff so
  tables, cards, filters, and empty states remain readable.
- Keep pagination bounded and explicit; validate paging/filter inputs at server
  boundaries.
- For async client data loads, default to showing visible loading and error states so
  failures are discoverable and not mistaken for empty results.
- No floating promises.
- No `console.log` (use `console.warn` / `console.error` only).
- Do not import full `lodash` or `lodash/fp`; import specific modules.
- Do not import `next/link`; use `@/components/Link`.
- Import Zod from `zod/v4`, not `zod`.
- Prefer Drizzle relational API (`db.query.*`) where practical.
- Use `clsx` for class composition and `@/*` path aliases.
- Avoid editing `src/vendor/**` and `ckEditor/**` unless explicitly required.

Types and naming:

- If a shared type changes purpose during a refactor, rename it rather than keeping a
  misleading historical name.
- Keep frontend-only helper types near the feature they support unless they are
  clearly shared across multiple feature areas.
- Avoid broad `as` casts at boundaries when a named type, transform, or validated
  contract can express the shape more clearly.

## Safety and Handoff Checklist

1. Never commit secrets or `.env` values.
2. Keep changes scoped to the requested task.
3. Prefer minimal diffs that align with adjacent patterns.
4. If adding env vars, update `ProcessEnv.d.ts` and document usage.
5. Run `lint`, `typecheck`, and relevant tests before handoff. If any are blocked by
   unrelated existing failures, say so explicitly and name the blocking file(s).
6. In final handoff, include:
   - patterns followed
   - intentional deviations and rationale
   - validation results (`lint`, `typecheck`, relevant tests)
