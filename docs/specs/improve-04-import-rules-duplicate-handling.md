# IMPROVE-04. Import rules duplicate handling

## Context / why

Rules import currently merges JSON object keys directly into existing rules. This can create case-variant duplicates (for example, `Example.com` and `example.com`) and does not provide an explicit conflict strategy for import-time duplicates.

## Goals

- Handle imported rule duplicates case-insensitively.
- Use a predictable duplicate strategy at import time: replace or skip.
- Avoid silent data loss by surfacing duplicate handling decisions to the user.

## Non-goals

- Manual add/edit duplicate flow (`IMPROVE-02`, `IMPROVE-03`).
- Proxy import duplicate handling (`IMPROVE-05`).
- Rule pagination/search/sorting improvements.

## User scenarios

- User imports rules with domains that already exist (same or different casing) and chooses replace.
- User imports rules with domains that already exist and chooses skip.
- User imports a malformed file with duplicate domains inside the same import payload (case-insensitive) and gets a clear validation error.

## Requirements

- Must: Detect duplicate domains against existing rules using case-insensitive comparison.
- Must: Before applying import with conflicts, prompt a deterministic global choice: replace duplicates or skip duplicates.
- Must: `replace` overwrites existing conflicting rules with imported values.
- Must: `skip` keeps existing conflicting rules and imports only non-conflicting domains.
- Must: Persist domain keys in canonical lowercase form (`trim().toLowerCase()`) for manual save/edit and import.
- Must: Show import result summary (added/replaced/skipped) after import.
- Must: Reject import payloads that contain case-insensitive duplicate domains within the imported file.
- Must: Skip imported `PROXY_BY_RULE` entries that reference a proxy name that does not exist in current proxies storage.
- Must: Skip invalid rule entries (unknown shape/type) and include them in import summary counters.
- Should: Keep merge logic in pure helpers covered by unit tests.
- Could: Expand duplicate UX to per-entry conflict resolution in a future task.

## Risks / questions

- A global choice is faster and simpler than per-entry conflict prompts, but less granular.
- Domain normalization is currently `trim().toLowerCase()`; no additional punycode normalization is introduced in this task.

## Plan (steps)

1. Add pure helper(s) for duplicate-aware import merge semantics.
2. Update rules import flow to prompt replace/skip on conflicts and display summary.
3. Validate import payload for case-insensitive duplicates within the same file.
4. Add/extend unit tests for merge behavior and edge cases.
5. Run lint/tests/MV3 static checks.

## Instruction for AI

- Keep ES modules and existing style conventions.
- Reuse `findDuplicateSiteRuleDomain()` for case-insensitive duplicate detection.
- Keep user-facing behavior explicit (no silent conflict overwrite).
- Append implementation decisions in changelog.

## Changelog / Decisions

- 2026-04-11: Spec created for import duplicate handling with explicit replace/skip strategy.
- 2026-04-11: Chosen UX is a single global conflict prompt (`OK = replace`, `Cancel = skip`) for all detected duplicates.
- 2026-04-11: Import payload now rejects case-insensitive duplicate domains within the same file to prevent ambiguous merges.
- 2026-04-11: Implemented pure import helpers in `extension/popup/site-rules.js`: conflict discovery and merge with stats (`added/replaced/skipped`).
- 2026-04-11: Updated rules import flow to prompt duplicate strategy, apply deterministic merge, and show explicit result summary.
- 2026-04-11: Added unit coverage for duplicate import strategies and validation edge-cases in `tests/unit/site-rules.test.js` and `tests/unit/validation.test.js`.
- 2026-04-11: Manual Chrome verification still pending; roadmap status stays `in_progress`.
- 2026-04-11: Added missing-proxy guard for import: `PROXY_BY_RULE` rules that reference unknown proxies are skipped and counted in import summary.
- 2026-04-11: Legacy string-rule import support removed by request; importer accepts only current object rule format.
- 2026-04-11: Invalid/unsupported rule entry formats are now skipped (not imported) and reported explicitly in summary.
- 2026-04-11: Domain keys are now canonicalized to lowercase on save/edit/import to avoid case-variant keys in storage and UI.
- 2026-04-11: Manual verification completed in Chrome popup; duplicate replace/skip, missing-proxy skip, and lowercase canonicalization confirmed.
