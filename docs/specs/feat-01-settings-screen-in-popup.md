# FEAT-01. Settings screen in popup

## Context / why

The popup main screen should focus on proxy operation. Technical controls such as debug logging are useful, but keeping them in the header makes the primary workflow noisier and leaves no clear home for later preferences.

## Goals

- Add a dedicated Settings screen to the popup.
- Add a main-screen navigation entry point for Settings.
- Move debug logging control from the header into Settings.
- Preserve existing logging storage behavior and background notification.

## Non-goals

- Adding theme selection; that remains `IMPROVE-20`.
- Moving proxy/rules CRUD into Settings.
- Changing storage keys or logging semantics.

## User scenarios

- User opens Settings from the main popup screen.
- User toggles debug logging from Settings.
- User returns from Settings to the main screen.

## Requirements

- Must: Add `settingsScreen` to popup templates.
- Must: Keep `loggingEnabled` stored in the existing storage path.
- Must: Keep sending `setLoggingEnabled` runtime messages when logging changes.
- Must: Remove the debug logging toggle from the header.
- Should: Keep Settings compact and consistent with existing popup screens.
- Should: Keep a clear path back to the main screen.

## Final behavior

- Main screen navigation now includes Settings alongside Proxies and Rules.
- Settings is a normal popup screen with a Back button to the main screen.
- Debug logging control moved out of the header and into Settings.
- The logging control keeps the existing `loggingToggle` ID, uses `aria-pressed`, and displays `On` / `Off`.
- Toggling logging still updates `loggingEnabled`, updates the logger, persists to storage, and sends `setLoggingEnabled` to the background runtime.
- Header now shows only the popup title.

## Verification

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run dev:seeded -- --dry-run`: passed.

## Risks / questions

- Existing code expects `loggingToggle` to exist; the element can move screens, but the ID must remain stable.
- Later theme work should have a clear place to add controls.

## Plan (steps)

1. Add Settings screen template and main navigation button.
2. Move logging toggle markup into Settings while preserving `loggingToggle` ID.
3. Update popup logging state rendering for the new button label and aria state.
4. Add template test coverage for Settings IDs.
5. Run lint, tests, MV3, package, and seeded dry-run checks.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Settings screen is a normal popup screen rendered by `templates.js`; debug logging keeps the existing `loggingToggle` ID and storage behavior.
- 2026-07-12: Added Settings navigation, moved debug logging into Settings, and updated the control to expose `On` / `Off` state.
- 2026-07-12: Task completed; roadmap status moved to `done`.
