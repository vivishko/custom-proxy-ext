# IMPROVE-03. Rule editing + duplicate warning

## Context / why

The rules screen supports add/delete and proxy-setting change, but it does not support explicit domain editing from the table. This makes rule correction slower and can lead to delete+recreate workarounds.

`IMPROVE-02` added duplicate warnings for manual add flow. Domain edit flow still needs duplicate handling so users do not accidentally create conflicting rules.

## Goals

- Add explicit rule edit action from rules table.
- Allow updating rule domain and proxy setting in one flow.
- Show duplicate-domain warning in edit flow (case-insensitive, excluding currently edited domain).

## Non-goals

- Import duplicate conflict resolution (`IMPROVE-04`).
- Rule pagination/search/sorting tasks.
- Background proxy matching logic changes.

## User scenarios

- User clicks edit icon for a rule, changes domain or proxy setting, then saves.
- User edits a rule domain to one that already exists and receives replace/cancel warning.
- User cancels edit mode and returns to regular add mode.

## Requirements

- Must: Rules table includes an edit action per row.
- Must: Edit action populates the rules form and switches form to edit mode.
- Must: Save in edit mode updates existing rule, including domain rename.
- Must: Duplicate warning is shown in edit mode when target domain already exists (case-insensitive).
- Must: Duplicate check excludes currently edited domain.
- Must: Choosing replace in warning overwrites target domain rule.
- Should: Edit mode has clear affordance (`Save Rule`, `Cancel`) and can be reset after save/delete/cancel.
- Could: Keep rule setting select value stable when leaving edit mode.

## Decisions

- Use inline edit flow on Rules screen by reusing existing form (no modal).
- Add row-level pencil button for starting edit.
- Keep duplicate warning text aligned with `IMPROVE-02` behavior (replace or cancel).
- Implement pure helper functions for rule save semantics and cover them with unit tests.
- Add explicit cancel action for edit mode; reset form mode after save/delete/cancel.
- Reset rule form to add-mode when main-screen quick action "Add rule for this site" is used.

## Risks / questions

- Main-screen "Add rule for this site" shortcut must not accidentally stay in edit mode.
- Existing rule keys may differ only by casing; edit flow should handle safe key replacement.

## Plan (steps)

1. Update roadmap status and spec link.
2. Implement rules edit mode and duplicate warning in `extension/popup/site-rules.js`.
3. Add minimal UI controls/styles for edit/cancel affordance.
4. Add/update unit tests for edit-save helper logic.
5. Run lint/tests/MV3 checks.
6. Perform manual Chrome verification and then move task to done.

## Instruction for AI

- Keep JS ES modules and existing coding style.
- Reuse existing duplicate check utility for case-insensitive comparison.
- Keep spec synced with implementation decisions and append changelog entries.

## Changelog / Decisions

- 2026-03-30: Spec created; scope confirmed for inline rule edit mode + duplicate warning in edit flow.
- 2026-03-30: Implemented edit mode in rules table with pencil action, `Save Rule`/`Cancel` flow, and duplicate warning handling for edited domains.
- 2026-03-30: Added unit tests for rule-setting mapping and domain-rename/duplicate replacement logic (`tests/unit/site-rules.test.js`).
- 2026-03-30: Manual verification completed in Chrome popup flow; edit/save/cancel and duplicate replacement behavior confirmed.
