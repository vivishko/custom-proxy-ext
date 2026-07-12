# IMPROVE-20. Light/dark theme switch in settings

## Context / why

This task originally tracked a manual light/dark theme switch in the Settings screen. After `FEAT-01` added Settings, `IMPROVE-15` implemented that exact behavior as part of the dark/light theme work.

## Goals

- Ensure the roadmap reflects that the Settings theme switch is complete.
- Avoid duplicating theme implementation work.
- Keep a spec record explaining why this task is closed by existing shipped behavior.

## Non-goals

- Adding a second theme control.
- Changing the existing theme storage key or UI.
- Adding a system-theme option.

## Final behavior

Implemented by `IMPROVE-15`:

- Settings includes a `Theme` control with `Light` / `Dark` states.
- The selected value persists in `chrome.storage.sync` under `themePreference`.
- The popup applies the selected theme using `document.documentElement.dataset.theme`.
- Missing or invalid values default to `light`.

## Verification

Covered by `IMPROVE-15` verification:

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run dev:seeded -- --dry-run`: passed.

## Changelog / Decisions

- 2026-07-12: Confirmed this task duplicates the completed `IMPROVE-15` scope.
- 2026-07-12: Roadmap status moved to `done`; no code changes required.
