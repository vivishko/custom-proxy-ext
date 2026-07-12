# IMPROVE-10. Rule sorting and filters

## Context / why

Rules pagination and text search make the rules table easier to use, but users still need better controls for ordering and narrowing rule lists. Sorting and filters should build on the existing rules table without changing stored rule data.

## Goals

- Add sorting controls for site rules.
- Add filters for rule type / proxy usage.
- Keep search, filters, sorting, and pagination consistent together.

## Non-goals

- Changing the storage schema.
- Adding proxy-table sorting or filters.
- Persisting table controls across popup sessions.

## User scenarios

- User sorts rules alphabetically to scan domains.
- User sorts recently added rules first to review new entries.
- User filters to proxy-backed rules or direct rules.
- User combines text search with sorting and filters.

## Requirements

- Must: Support alphabetical sorting by domain.
- Must: Support recently added sorting.
- Must: Support filtering by rule type / proxy usage.
- Must: Reset or clamp pagination when controls change.
- Must: Preserve import/export and add/edit/delete behavior.
- Should: Keep default ordering compatible with the current stored order.
- Should: Cover sorting/filtering helpers with unit tests.

## Final behavior

- Rules screen has three list controls above the table:
  - Search rules: existing text search across domain, rule type, and proxy name.
  - Filter: all rules, proxy-backed rules, `NO_PROXY`, `RANDOM_PROXY`, or `DIRECT_TEMPORARY`.
  - Sort: default storage order, recently added, domain A-Z, or domain Z-A.
- Changing search, filter, or sort resets pagination to page 1.
- Pagination is computed after search, filter, and sort.
- Adding or saving a rule clears list controls back to defaults so the saved rule remains visible.
- Import/export still reads and writes the persisted `siteRules` object without storing UI control state.

## Verification

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run e2e:extension`: blocked in this environment. In sandbox it timed out waiting for `DevToolsActivePort`; outside sandbox Chrome started, but the runner could not find the target extension in Chrome targets.

## Risks / questions

- Existing rules do not have an explicit created timestamp, so "recently added" uses reverse storage order.
- Multiple controls can make pagination state stale if the current page exceeds the filtered result count.

## Plan (steps)

1. Inspect current rules search and pagination integration.
2. Add pure helpers for rule sorting and filtering.
3. Add compact UI controls to the Rules screen.
4. Wire controls into render, add/edit/delete/import flows, and pagination clamping.
5. Add unit coverage for helper behavior and mixed search/filter/sort pagination.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Default sort keeps storage order; recently added is reverse storage order to avoid a storage migration.
- 2026-07-12: Implemented Rules screen filter and sort controls, with helper unit coverage for search/filter/sort pagination.
- 2026-07-12: Browser-level verification could not be completed in the local Codex environment because Chrome did not expose the target extension to the e2e runner.
- 2026-07-12: Implementation merged; roadmap status moved to `done`.
