# IMPROVE-16. Onboarding

## Context / why

New users need a short path from opening the popup to setting up proxies and rules. The popup now has a stable screen structure and Settings area, so onboarding can be added without disrupting core controls.

## Goals

- Show a first-run setup guide.
- Let users dismiss onboarding permanently.
- Provide a clear path to start setup.
- Allow users to reopen the guide from Settings.

## Non-goals

- Multi-step interactive tooltips.
- Seeding real proxy data.
- Changing proxy or rules behavior.
- Blocking normal popup use after onboarding is dismissed.

## User scenarios

- New user opens the popup and sees the setup guide.
- User skips the guide and does not see it again on the next open.
- User starts setup and lands on the Proxies screen.
- User reopens the guide from Settings.

## Requirements

- Must: Store onboarding completion state.
- Must: Default to showing onboarding when no completion state exists.
- Must: Provide Skip and Start setup actions.
- Must: Reopen onboarding from Settings.
- Should: Keep the guide compact and consistent with the popup style.
- Should: Avoid changing existing screen IDs or routing behavior.

## Final behavior

- First popup open shows a compact onboarding dialog until completion state is stored.
- `Skip` closes onboarding and stores completion.
- `Start setup` stores completion and opens the Proxies screen.
- Settings includes a Setup guide action that reopens onboarding without resetting completion state.
- Completion is stored in `chrome.storage.sync` under `onboardingCompleted`.
- Onboarding uses the existing popup styling and does not change proxy/rule behavior.

## Verification

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run dev:seeded -- --dry-run`: passed.

## Risks / questions

- Onboarding should not hide permanently unless the user chooses Skip or Start setup.
- Start setup should use the existing Proxies screen instead of introducing another setup flow.

## Plan (steps)

1. Add storage key/helpers for onboarding completion.
2. Add onboarding overlay template and Settings reopen action.
3. Wire first-run display, dismiss, and Start setup navigation.
4. Add template test coverage for onboarding IDs.
5. Run lint, tests, MV3, package, and seeded dry-run checks.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Chose a compact first-run overlay instead of tooltip tour to keep scope small and avoid fragile positioning.
- 2026-07-12: Added onboarding overlay, storage helpers, setup navigation, Settings reopen action, and template ID coverage.
- 2026-07-12: Task completed; roadmap status moved to `done`.
