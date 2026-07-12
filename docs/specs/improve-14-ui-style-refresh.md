# IMPROVE-14. UI style refresh

## Context / why

The popup has accumulated features across several tasks, but the visual layer still uses mostly default controls and mixed spacing. A focused style refresh should make the extension feel more cohesive while preserving existing workflows.

## Goals

- Refresh popup visual styling with a cleaner, modern operational-tool look.
- Improve spacing, hierarchy, button consistency, and table readability.
- Keep existing screens, controls, IDs, and JavaScript behavior intact.

## Non-goals

- Adding a light/dark theme toggle; that remains a separate task.
- Refactoring popup markup into components.
- Changing storage, proxy behavior, imports, exports, or table logic.

## User scenarios

- User opens the popup and can quickly distinguish status, controls, navigation, and data tables.
- User scans Rules and Proxies tables with clearer row, header, and action styling.
- User uses the popup at its existing compact width without text overlap.

## Requirements

- Must: Update styling without breaking existing DOM IDs or event wiring.
- Must: Keep the popup compact and suitable for repeated operational use.
- Must: Preserve accessibility labels/titles already present.
- Should: Improve button, form, table, status, and pagination consistency.
- Should: Avoid a one-note palette and avoid heavy decorative backgrounds.

## Final behavior

- Popup uses a shared CSS token layer for colors, borders, radius, and panel shadow.
- Main surfaces use a cleaner white panel over a neutral background.
- Status, toggles, selects, forms, table headers, row hover states, pagination, import/export controls, and action buttons have consistent spacing and focus states.
- Responsive rules keep controls stacked at narrow popup widths.
- No DOM IDs, JavaScript selectors, storage behavior, import/export logic, or extension manifest paths changed.

## Verification

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run dev:seeded -- --dry-run`: passed.

## Plan (steps)

1. Review current popup markup and CSS.
2. Add a cohesive token layer for colors, spacing, borders, and shadows.
3. Refresh screen, control, form, table, and action styling.
4. Run lint/tests/static checks.
5. Mark task done in the same branch after verification.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Implemented CSS-only UI refresh with shared tokens, updated control/table/action styling, and compact responsive behavior.
- 2026-07-12: Task completed; roadmap status moved to `done`, and dependent `IMPROVE-15` / `IMPROVE-16` unblocked.
