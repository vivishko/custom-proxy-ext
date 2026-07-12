# REFACTOR-02. Decompose popup.html into components

## Context / why

`extension/popup.html` has grown into a long static template that mixes shell concerns with every screen's markup. This makes future popup changes, especially Settings screen work, riskier because unrelated sections live in one large document.

## Goals

- Keep `popup.html` as a small MV3 popup shell.
- Move screen/header markup into component-oriented ES module helpers.
- Preserve all existing DOM IDs, classes, data attributes, and behavior.
- Document the new ownership boundary.

## Non-goals

- Changing popup behavior or storage.
- Introducing a build step or framework.
- Splitting CSS into multiple files.
- Adding the Settings screen; that remains `FEAT-01`.

## User scenarios

- Developer can update a single popup screen template without editing a long HTML document.
- Developer can add a Settings screen later by adding one template and wiring one screen route.
- Existing users see the same popup behavior after the refactor.

## Requirements

- Must: Keep `manifest.json` popup path unchanged.
- Must: Keep `popup.html` loading `popup/popup.js` as an ES module.
- Must: Preserve current selectors used by `popup.js`, `proxy-controls.js`, `site-rules.js`, and `proxy-crud.js`.
- Must: Avoid inline scripts and avoid adding a build step.
- Should: Use one template function per major popup section.
- Should: Update AGENTS.md file map for the new module boundary.

## Final behavior

- `extension/popup.html` is now a small shell with `#popupRoot`, stylesheet link, and module script.
- `extension/popup/templates.js` owns static popup markup via section-level template helpers:
  header, main screen, rules screen, proxies screen, and add-proxy screen.
- `extension/popup/popup.js` renders templates into `#popupRoot` at the start of `DOMContentLoaded` before existing modules query DOM elements.
- Existing DOM IDs, classes, navigation attributes, form fields, tables, and import/export inputs are preserved.
- No manifest path, storage behavior, proxy behavior, or build workflow changed.

## Verification

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run check:mv3`: passed.
- `npm run check:package`: passed.
- `npm run dev:seeded -- --dry-run`: passed.

## Risks / questions

- Rendering the shell dynamically means `popup.js` must mount templates before any DOM queries.
- Template strings must not drift from existing IDs because modules still use direct selectors.

## Plan (steps)

1. Move popup screen markup into `extension/popup/templates.js`.
2. Keep `extension/popup.html` as a root container plus stylesheet/script references.
3. Mount templates at the beginning of `popup.js` initialization.
4. Update docs and AGENTS.md for the new module boundary.
5. Run lint, tests, MV3, package, and seeded dry-run checks.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Chose ES module template helpers over static partial files to keep the no-build MV3 workflow.
- 2026-07-12: Moved popup static markup into `extension/popup/templates.js` and kept `popup.html` as a shell.
- 2026-07-12: Added unit coverage for required rendered template IDs.
- 2026-07-12: Task completed; roadmap status moved to `done`.
