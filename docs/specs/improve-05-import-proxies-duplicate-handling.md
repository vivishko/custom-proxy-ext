# IMPROVE-05. Import proxies duplicate handling

## Context / why

Proxy import currently overwrites existing entries only on exact-case name match and does not provide an explicit duplicate strategy choice. This leads to non-obvious behavior for case-variant names (for example, `Proxy-US` vs `proxy-us`) and can cause silent replacement.

## Goals

- Handle imported proxy duplicates case-insensitively.
- Use an explicit and deterministic duplicate strategy at import time (`replace` or `skip`).
- Avoid silent data loss by making duplicate handling decisions visible to the user.

## Non-goals

- Per-entry conflict-resolution UI during a single import run.
- Redesign of proxy model or storage schema.

## User scenarios

- User imports proxies file with names that conflict with existing proxies by case-insensitive comparison and chooses whether to replace or skip all duplicates.
- User imports file that contains case-insensitive duplicate names inside payload and receives a clear validation error.
- User imports file without conflicts and gets deterministic merge result with summary counters.

## Requirements

- Must: Detect duplicate proxy names against existing proxies using case-insensitive comparison.
- Must: Before applying import with conflicts, prompt a global strategy choice (`replace` or `skip`).
- Must: Reject payloads with case-insensitive duplicate names inside the same imported file.
- Must: Show explicit import summary (`added/replaced/skipped`) after processing.
- Should: Keep merge behavior deterministic and stable for mixed-case legacy names in storage.
- Could: Add per-proxy conflict resolution in a future task.

## Risks / questions

- Existing storage may already contain case-variant proxy duplicates; merge must behave predictably for first matching entry and still avoid hidden overwrite.
- Import payload may include malformed rows; current behavior validates structure before merge and fails fast.

## Plan (steps)

1. Add duplicate-aware helper functions for proxy import conflict detection and merge strategy.
2. Update import flow in popup proxy CRUD to ask user for `replace/skip` when conflicts exist.
3. Strengthen import validation for case-insensitive duplicates in payload.
4. Add/extend unit tests for duplicate handling and edge cases.
5. Run lint/tests/MV3 checks.

## Changelog / Decisions

- 2026-04-13: Spec created for proxy import duplicate handling with explicit case-insensitive strategy.
- 2026-04-13: Chosen UX is one global prompt (`OK = replace`, `Cancel = skip`) for all detected proxy-name conflicts.
- 2026-04-13: Import validation rejects case-insensitive duplicate names within the same file to prevent ambiguous merges.
- 2026-04-13: Implemented duplicate-aware import helpers in `extension/popup/proxy-crud.js`: conflict detection, case-insensitive matching, and deterministic merge with `replace/skip` strategy.
- 2026-04-13: Import completion now always shows explicit counters (`Added`, `Replaced`, `Skipped`) to avoid silent data loss.
- 2026-04-13: Added unit coverage for proxy import duplicate handling and edge-cases in `tests/unit/proxy-crud.test.js` and updated `tests/unit/validation.test.js`.
