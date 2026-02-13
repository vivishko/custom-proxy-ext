# REFACTOR-01. Codebase decomposition

## Context / why

popup.js (869 lines) and background.js (679 lines) are monoliths. popup.js lives
entirely inside a single `DOMContentLoaded` closure -- nothing is exported, nothing
is testable, 20+ variables share one scope. background.js contains a 198-line god
function (`applyProxySettings()`) and a 136-line auth handler (`onAuthRequired`).
The code is hard to maintain, extend, and test.

Origin: docs/ideas/2026-02-refactoring-plan.md

## Goals

- Split popup.js and background.js into focused ES modules by responsibility.
- Create a shared storage layer instead of direct `chrome.storage.sync` calls.
- Eliminate code duplication (dropdowns, storage keys).
- Make code testable (pure functions, named exports).
- Enforce consistent `STORAGE_KEYS` usage everywhere.

## Non-goals

- Changing user-facing behavior of the extension.
- Adding new features.
- Migrating to TypeScript or introducing a build step.
- Writing a full test suite (separate follow-up task after refactor).

## User scenarios

Refactoring does not change UX. After completion, the extension must work
identically to the current version:

- Global proxy toggle enables/disables proxy.
- Per-page toggle works for the current tab.
- Proxy and rule CRUD works.
- Import/export works.
- PAC script is generated correctly.
- Proxy authentication works.

## Requirements

- Must: All `chrome.storage.sync` access uses `STORAGE_KEYS` constants -- no raw strings.
- Must: Decompose popup.js into modules:
  - `popup/popup.js` -- entry point, init, screen routing.
  - `popup/ui-render.js` -- rendering helpers (dropdowns, tables, status display).
  - `popup/proxy-controls.js` -- toggle/select handlers (global, per-page).
  - `popup/site-rules.js` -- site rules CRUD + import/export.
  - `popup/proxy-crud.js` -- proxy CRUD + import/export.
  - `popup/validation.js` -- form validation.
- Must: Decompose background.js into modules:
  - `background/background.js` -- entry point, listeners, message router.
  - `background/pac-builder.js` -- `buildPacScript()` + helpers.
  - `background/proxy-modes.js` -- 4 proxy application strategies (`applyPacPerSite`, `applyFixedServers`, `applyPacComplexRules`, `applyDirect`).
  - `background/auth-handler.js` -- `onAuthRequired` logic.
  - `background/tab-tracker.js` -- temporary sites cleanup on tab close.
- Must: Shared storage layer (`shared/storage.js`) -- single storage access module imported by both popup and background.
- Must: Magic numbers extracted into constants -- timeouts, debounce, retry params in a `TIMEOUTS` object in utils.js.
- Must: Remove dead code -- `tabs.js` reference in manifest.json, unused `notifications` permission.
- Must: Move inline styles from popup.html into popup.css.
- Should: Single `buildProxyOptions(proxies)` function instead of 3 duplicates in popup.js.
- Should: Consistent async/await instead of mixed callbacks and promises in background.js.
- Should: Extract form validation into standalone pure functions.
- Could: Optimize icon48.png (1.5 MB is excessive for a 48px icon).
- Could: Add JSDoc comments to exported functions in new modules.

## Risks / questions

- Manifest V3 service worker loads as ES module. Moving background.js to `background/background.js` requires updating the path in manifest.json. Similarly popup.html must reference the new `popup/popup.js`.
- `endsWithDomain` and rule-matching logic are duplicated inside the PAC script string because PAC runs in a sandbox. This is technically required, but creates a logic-drift risk. Add warning comments in both places.
- No automated tests exist. Each refactoring phase must be manually verified: load extension, check toggle, per-page, rules, proxies, import/export.
- The storage layer must not add overhead to the number of `chrome.storage.sync` calls.

## Plan (steps)

### Phase 1: Quick wins (low risk, ~1-2 hours)

1. Replace all raw storage key strings with `STORAGE_KEYS.*` in popup.js.
2. Extract magic numbers into a `TIMEOUTS` object in utils.js.
3. Remove dead code from manifest.json (`tabs.js` reference, `notifications` permission).
4. Move inline styles from popup.html to popup.css.
5. Verify: load extension, check main scenarios.

### Phase 2: Decompose popup.js (~4-6 hours)

1. Create `popup/storage.js` -- `chrome.storage.sync` wrappers.
2. Create `popup/ui-render.js` -- `buildProxyOptions()`, `renderStatus()`.
3. Create `popup/validation.js` -- proxy form validation.
4. Create `popup/proxy-controls.js` -- toggle/select handlers.
5. Create `popup/site-rules.js` -- rules CRUD, import/export.
6. Create `popup/proxy-crud.js` -- proxy CRUD, import/export.
7. Keep `popup/popup.js` as entry point: init, screen routing, wiring.
8. Update popup.html: `<script src="popup/popup.js" type="module">`.
9. Verify: full walkthrough of all screens.

### Phase 3: Decompose background.js (~3-4 hours)

1. Create `background/pac-builder.js` -- `buildPacScript()`.
2. Create `background/proxy-modes.js` -- 4 strategy functions.
3. Create `background/auth-handler.js` -- `onAuthRequired`.
4. Create `background/tab-tracker.js` -- tab close cleanup.
5. Keep `background/background.js` as entry point: listeners, message router.
6. Update manifest.json: `"service_worker": "background/background.js"`.
7. Verify: proxy toggle, per-page, auth, tab close cleanup.

### Phase 4: Shared storage layer (~2-3 hours)

1. Create shared `shared/storage.js` (or adapt popup/storage.js for use by both sides).
2. Migrate background to the shared storage module.
3. Verify: all scenarios.

### Phase 5: Final cleanup (~1 hour)

1. Ensure import consistency across all modules.
2. Add warning comments near duplicated PAC logic.
3. Update AGENTS.md "Files to know" section with the new file structure.
4. Final verification.

## Instruction for AI

- Refactoring MUST NOT change extension behavior. Only code structure.
- After each phase: load extension in chrome://extensions/ and verify main scenarios (global toggle, per-page toggle, add proxy, add rule, import/export).
- Use ES modules (import/export). No TypeScript, no build step.
- Preserve formatting: 2-space indent, double quotes, semicolons required.
- Update AGENTS.md after each phase if file structure changes.
- When renaming files, update ALL references (manifest.json, popup.html, imports, documentation).

## Changelog / Decisions

- 2026-02-13: Spec created from refactoring plan (docs/ideas/2026-02-refactoring-plan.md).
- 2026-02-13: **Phase 1 completed.** Quick wins:
  - 1.1: Replaced all 10 raw storage key strings in popup.js (`"proxies"`, `"siteRules"`, etc.) with `STORAGE_KEYS.*` constants, including both `get()` and `set()` calls. Also converted property access on settings objects to bracket notation (`settings[STORAGE_KEYS.x]`).
  - 1.2: Created `TIMEOUTS` object in utils.js with 6 named constants (`proxyCheckDelay`, `debounceApply`, `tabRetryInterval`, `tabMaxAttempts`, `hintDuration`, `feedbackDuration`). Replaced all magic numbers in popup.js (retry logic, hint/feedback durations) and background.js (debounce 100ms, checkCurrentProxySettings 1000ms delays).
  - 1.3: Removed dead `web_accessible_resources` section referencing non-existent `tabs.js` from manifest.json. Removed unused `notifications` permission.
  - 1.4: Moved all inline `<style>` block (58 lines of logging toggle CSS) from popup.html into popup.css. Replaced inline `style="display: none"` on file inputs with `.hidden-file-input` CSS class.
- 2026-02-13: **Phase 2 completed.** Decomposed popup.js (869 lines) into 6 focused modules under `popup/`:
  - `popup/storage.js` — chrome.storage.sync wrapper with typed getters/setters (`getProxies()`, `setSiteRules()`, `getAllSettings()`, etc.). 14 exported functions, all async. Eliminates direct `chrome.storage.sync` calls from other modules.
  - `popup/ui-render.js` — rendering helpers: `buildProxyOptions()` and `buildRuleProxyOptions()` replace 3 duplicate dropdown-construction blocks. `resolveTemporaryProxyName()`, `setModeHint()`, `showModeInteractionHint()`, `updateProxyStatusDisplay()` extracted as named exports.
  - `popup/validation.js` — 3 pure validation functions: `validateProxy()`, `validateImportedProxies()`, `validateImportedSiteRules()`. Previously inline in submit/import handlers.
  - `popup/proxy-controls.js` — `initProxyControls()` wires global toggle, page toggle, select handlers, add-rule button, control group hints. Returns `{ loadMainControls, refreshStatus, updateOnlyThisPageLabel }`.
  - `popup/site-rules.js` — `initSiteRules()` handles rules CRUD, import/export, dropdown population. Returns `{ renderSiteRules, loadProxiesForDropdown, getSiteDomainInput, getSiteProxySelect, getAddSiteRuleButton }`.
  - `popup/proxy-crud.js` — `initProxyCrud()` handles proxy add form, table rendering, delete with cascade cleanup, import/export. Returns `{ renderProxies }`.
  - `popup/popup.js` — entry point (~160 lines): screen routing, logging toggle, tab info retrieval, initialization. Wires modules via dependency injection.
  - Updated `popup.html`: `<script>` src changed from `popup.js` to `popup/popup.js`.
  - Old root `popup.js` is now superseded by `popup/popup.js` (can be deleted after verification).
- 2026-02-13: **Phase 3 completed.** Decomposed background.js (679 lines) into 4 modules under `background/`:
  - `background/pac-builder.js` — `buildPacScript(logger)` extracted as standalone async function (~110 lines). Added WARNING comments about PAC sandbox duplication of `endsWithDomain` and `chooseRandomProxy` (logic drift risk documented).
  - `background/proxy-modes.js` — 4 strategy functions: `applyPacMode()`, `applyFixedServers()`, `applyDirect()`, `applyProxySettings()`. The god function `applyProxySettings` (198 lines) refactored into a coordinator that delegates to strategy functions. All take `{ logger, maybeReload }` deps.
  - `background/auth-handler.js` — `registerAuthHandler(logger)` encapsulates the 136-line `onAuthRequired` listener. Jivosite bypass documented with comment.
  - `background/tab-tracker.js` — `initTabTracker({ logger, applyProxySettings, checkCurrentProxySettings })` handles `tabDomainById` Map, `onUpdated`, `onRemoved` listeners.
  - `background/background.js` — entry point (~190 lines): logger setup, tab reload helpers, debug functions, debounce, storage listener, message router, wires all modules.
  - Updated `manifest.json`: `service_worker` changed from `background.js` to `background/background.js`.
  - Fixed missed hardcoded `1000` (line 452 in old file) → `TIMEOUTS.proxyCheckDelay`.
  - Old root `background.js` is now superseded by `background/background.js` (can be deleted after verification).
- 2026-02-13: **Phase 4 completed.** Shared storage layer:
  - Added `shared/storage.js` as the single chrome.storage.sync access module.
  - Migrated background modules to use shared storage APIs (no direct `chrome.storage.sync` calls).
  - Updated popup modules to import shared storage directly; removed `popup/storage.js`.
- 2026-02-13: **Phase 5 started.** Final cleanup:
  - Added explicit WARNING comments in `utils.js` to keep PAC template logic in sync.
  - Updated AGENTS.md to reflect new file structure and docs/specs path.
  - Manual verification still required before marking phase 5 complete.
