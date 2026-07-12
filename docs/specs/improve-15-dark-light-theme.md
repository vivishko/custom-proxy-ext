# IMPROVE-15. Dark/light theme

## Context / why

The refreshed popup styling provides a stable visual foundation, but users still need a darker option for low-light environments. Settings now exists, so theme selection has a clear home.

## Goals

- Add a light/dark theme toggle.
- Persist the selected theme in `chrome.storage.sync`.
- Apply the selected theme to the popup UI.
- Keep the implementation small and compatible with the existing no-build MV3 flow.

## Non-goals

- Following system theme automatically.
- Adding more than two themes.
- Changing proxy, rules, import/export, or logging behavior.

## User scenarios

- User opens Settings and switches the popup to Dark.
- User reopens the popup and sees the previously selected theme.
- User switches back to Light.

## Requirements

- Must: Add a theme control to Settings.
- Must: Persist the theme preference.
- Must: Default to Light when no preference exists.
- Must: Apply theme without changing existing DOM IDs used by feature code.
- Should: Reuse the existing CSS token layer.
- Should: Avoid duplicating full CSS rules for both themes.

## Final behavior

- Settings includes a Theme toggle with `Light` / `Dark` state.
- Theme preference is stored in `chrome.storage.sync` under `themePreference`.
- Missing or invalid theme values default to `light`.
- Popup applies the selected theme through `document.documentElement.dataset.theme`.
- Dark theme uses CSS token overrides, so existing screen/table/form/button rules remain shared.
- The theme toggle uses `aria-pressed` and updates immediately before persisting.

## Verification

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run dev:seeded -- --dry-run`: passed.

## Risks / questions

- Theme needs to apply early enough during popup initialization to avoid stale visual state.
- Color tokens must keep tables, forms, disabled controls, and status states readable in both themes.

## Plan (steps)

1. Add storage key/helpers for `themePreference`.
2. Add Settings theme toggle markup.
3. Apply `data-theme` to the popup document and persist toggle changes.
4. Add dark-mode CSS variable overrides.
5. Update template tests and run verification.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Theme is explicit Light/Dark only; no system-following mode in this task.
- 2026-07-12: Added Settings theme toggle, `themePreference` storage helpers, and dark-mode CSS token overrides.
- 2026-07-12: Task completed; roadmap status moved to `done`.
