# IMPROVE-07. Rules table pagination

## Context / why
When site rules grow, the rules table becomes long and harder to scan inside popup. Pagination keeps the screen readable and keeps interactions predictable in a constrained popup height.

## Goals
- Show at most 10 site-rule rows per page.
- Provide bounded previous/next navigation with visible page indicator.
- Keep page state stable after add/edit/delete/import flows.

## Non-goals
- Configurable page size.
- Rules search/filter/sorting.
- Changes to rules storage schema.

## User scenarios
- User has up to 10 rules and sees all rules on page 1/1 with disabled navigation.
- User has 23 rules and can navigate across pages 1/3, 2/3, 3/3.
- User deletes the last item on the last page and current page is clamped to the previous valid page.
- User adds a new rule and lands on the page containing the newly saved rule.

## Requirements
- Must: Rules table page size is fixed at 10.
- Must: Navigation is bounded to `[1..totalPages]`.
- Must: Empty list remains stable (`Page 1 of 1`).
- Must: Add/delete/import actions re-render with valid page index (no blank invalid pages).
- Should: Keep pagination logic deterministic and unit-testable via pure helpers.

## Risks / questions
- Rules are stored as object map, so UI order follows object key insertion order.
- Search behavior is out of scope in current screen and should not be introduced implicitly.

## Plan (steps)
1. Add pagination controls to the Rules screen markup.
2. Add pure pagination helpers for rules entries and cover them with unit tests.
3. Integrate helpers into rules rendering and mutation flows (add/delete/import).
4. Run lint/test/MV3 checks and update decisions log.

## Instruction for AI
Implement 10-items-per-page pagination for Rules table with bounded controls and stable behavior after rule mutations.

## Changelog / Decisions
- 2026-04-13: Spec created and roadmap task moved to `in_progress`.
- 2026-04-13: Decision: fixed page size `10` (same pattern as proxies pagination).
- 2026-04-13: Added Rules pagination controls in popup UI (`Previous` / `Next` + `Page X of Y`).
- 2026-04-13: Implemented reusable rules pagination helpers in `popup/site-rules.js` (`getSiteRulesPage`, `getPageForItemIndex`) backed by shared `paginateItems`.
- 2026-04-13: Add/edit flow now navigates to the page containing the saved rule; delete/import flows clamp page index to valid range through render-time pagination metadata.
- 2026-04-13: Added unit tests for rules pagination edge cases (empty/invalid input, page slicing, page clamp after shrink, target page calculation for new item).
- 2026-04-13: Automated checks run: `npm run lint`, `npm test`, `npm run check:mv3` passed locally.
- 2026-05-06: Rebased on `origin/main`; conflicts resolved by preserving upstream roadmap additions and final pagination task state.
- 2026-05-06: Task marked `done`; `IMPROVE-08` unblocked because its only dependency (`IMPROVE-07`) is complete.
