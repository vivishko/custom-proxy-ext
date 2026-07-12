# TEST-03. Browser e2e extension tests

## Context / why
Current automated coverage verifies pure logic and selected integration paths, but it does not exercise the real popup UI inside a browser extension context. Flows such as file import, confirm/alert handling, DOM updates, and `chrome.storage.sync` integration can still regress without test failures.

## Goals
- Add browser-level automated tests for high-value extension popup flows.
- Load the unpacked extension in a controlled browser profile.
- Verify storage-level outcomes after real UI interactions.

## Non-goals
- Testing every visual detail or CSS layout.
- Replacing manual exploratory testing entirely.
- Running browser e2e in release packaging unless CI scope is explicitly expanded.

## User scenarios
- Developer runs e2e tests before closing import-related work.
- Import proxy duplicate handling is verified through the actual popup file input and dialogs.
- Storage assertions catch regressions in user-facing flows that unit tests miss.

## Requirements
- Must: Add a repeatable command for browser e2e tests.
- Must: Load the unpacked Manifest V3 extension in an isolated browser profile.
- Must: Verify at least one popup flow through real DOM interaction.
- Must: Include proxy import duplicate handling coverage for replace, skip, and invalid duplicate payload paths.
- Must: Assert final `chrome.storage.sync` state after each scenario.
- Should: Reuse fixtures from TEST-02 where possible.
- Should: Keep tests deterministic and avoid external network dependencies.
- Could: Add CI execution after local reliability is proven.

## Risks / questions
- Browser extension e2e can be brittle across Chrome/Chromium versions.
- Playwright-managed Chromium may be more reliable than system Google Chrome for loading unpacked extensions.
- Dialog and file-input automation must be explicit to avoid false positives.

## Plan (steps)
1. Choose browser automation tooling, likely Playwright with persistent Chromium context.
2. Add extension launch helper that returns the extension ID and popup URL.
3. Add storage seed/read helpers for `chrome.storage.sync`.
4. Add e2e tests for proxy import duplicate replace/skip/error flows.
5. Document local command and known limitations.

## Instruction for AI
Keep the first e2e suite narrow and high-signal. Prefer stable storage assertions over broad UI snapshots.

## Changelog / Decisions
- 2026-05-06: Task created after identifying the need for browser-level extension automation beyond Node unit/integration tests.
- 2026-07-12: Started implementation; task status moved to `in_progress`.
- 2026-07-12: Added `npm run e2e:extension` with a dependency-free Chrome DevTools Protocol runner that targets real popup import flows and `chrome.storage.sync` state.
- 2026-07-12: Added initial e2e coverage for proxy import duplicate replace, skip, and invalid duplicate payload flows using `examples/dev/` fixtures.
- 2026-07-12: Local system Chrome in this environment did not load the repo's unpacked extension via command-line flags; runner now fails fast with loaded target diagnostics instead of selecting unrelated built-in extension IDs. Task remains `in_progress` until a Chrome/Chromium binary that loads the unpacked extension is verified.
- 2026-07-12: Improved extension id resolution by inspecting candidate Chrome extension targets via CDP and matching `chrome.runtime.getManifest()` against this repo's manifest, preventing false positives from built-in Chrome extensions such as Google Hangouts or Network Speech.
