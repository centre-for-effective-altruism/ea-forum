# permissions-model

A model-based testing approach for EA Forum permissions, derived from ForumMagnum.

<!-- TODO remove dependence on this -->
See `../gh-moderation/README.md` for detailed analysis of ForumMagnum's moderation features.

## Test Priority Labels

- P1: Data exposure or access control violations (e.g., non-author seeing drafts, banned users viewing content)
- P2: Core features that should work correctly (e.g., authors seeing their own drafts, public posts visible)
- P3: Error handling, edge cases, and UNSTABLE tests that don't yet match ForumMagnum. Also includes some that are just there to hit 100% test coverage
