# IMPROVE-09. Proxies table pagination

## Context / why
When the proxy list grows, the table becomes hard to scan in popup and can feel crowded. The task goal is to keep the proxies table readable and predictable by showing a fixed number of rows per page.

## Goals
- Show at most 10 proxy rows in the proxies table at a time.
- Add clear page navigation controls (previous/next + current page indicator).
- Keep pagination stable after CRUD/import actions.

## Non-goals
- Making page size configurable.
- Adding sorting/filtering/search for proxies.
- Changing storage schema for proxies.

## User scenarios
- User has 3 proxies and sees all rows, with pagination controls disabled or hidden appropriately.
- User has 25 proxies and can move between pages 1/3, 2/3, 3/3.
- User deletes the only row on the last page and UI moves to the previous valid page without errors.

## Requirements
- Must: Proxies table uses page size = 10.
- Must: Navigation is bounded (cannot go below page 1 or above last page).
- Must: After data changes (add/import/delete), current page is clamped to valid range.
- Must: Empty state remains stable (no crashes, page shown as 1/1).
- Should: Keep rendering logic deterministic and testable with pure helpers.
- Could: Reuse pagination helpers for rules table in a future task.

## Risks / questions
- Need to avoid stale closure data in delete handlers when rows are paginated.
- Pagination control copy should remain simple in compact popup UI.

## Plan (steps)
1. Add pure pagination helpers with unit tests (including edge cases).
2. Add pagination controls markup/styles for proxies screen.
3. Update proxy table rendering to slice by page and clamp page index after mutations.
4. Run lint/tests/MV3 checks and update docs with implementation decisions.

## Instruction for AI
Implement 10-items-per-page pagination for proxies table with bounded prev/next navigation and test coverage for pagination edge cases.

## Changelog / Decisions
- 2026-03-30: Spec created and task moved to in-progress.
- 2026-03-30: Decision: fixed page size is 10 for this task scope; no settings-level configurability.
- 2026-03-30: Implemented UI pagination controls on Proxies screen (`Previous` / `Next` + `Page X of Y`) with bounded navigation.
- 2026-03-30: Added pure helper module `popup/pagination.js` and unit tests for clamping, empty state, invalid input, and page slicing.
- 2026-03-30: Pagination state now clamps automatically after add/import/delete operations; task remains `in_progress` until manual popup verification is completed.
- 2026-04-11: Manual popup verification completed; task moved to `done` in roadmap.
