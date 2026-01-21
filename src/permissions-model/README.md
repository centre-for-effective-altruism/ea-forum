# permissions-model

A model-based testing approach for EA Forum permissions, derived from ForumMagnum.

<!-- TODO remove dependence on this -->
See `../gh-moderation/README.md` for detailed analysis of ForumMagnum's moderation features.

## Stability Labels

**IMPORTANT**: Each `describe()` block must indicate whether the functionality is stable (fully matches ForumMagnum behavior) or unstable (work in progress).

- **No label** (e.g., `describe("viewPost", ...)`) = STABLE - fully matches ForumMagnum behavior
- **[UNSTABLE]** (e.g., `describe("[UNSTABLE] createComment", ...)`) = not yet fully matching ForumMagnum

Current stable functions:
- `viewPost`
- `viewComment`

All other actions (createUser, updateUser, createPost, updatePost, createComment, updateComment, vote, etc.) are unstable until their permission checks fully match ForumMagnum.

**Convention**: When making a function stable, remove the [UNSTABLE] prefix from its describe block. When adding new functionality, always start with [UNSTABLE].

## Test Priority Labels

- P1: Data exposure or access control violations (e.g., non-author seeing drafts, banned users viewing content)
- P2: Core features that should work correctly (e.g., authors seeing their own drafts, public posts visible)
- P3: Error handling, edge cases, and tests that don't yet match ForumMagnum. Also includes some that are just there to hit 100% test coverage
