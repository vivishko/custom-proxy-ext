# IMPROVE-02. Warn on duplicate rule (manual)

## Context / why
Manual rule creation or editing can silently create duplicates for the same domain, which leads to confusion and redundant entries in the rules list.

## Goals
- Warn the user about a duplicate domain rule during manual add.
- Reduce accidental duplicates in the rules list.

## Non-goals
- Handling duplicates on import.
- Automatic changes without user choice.

## User scenarios
- User enters a domain that already exists, sees a warning, and chooses cancel or replace.

## Requirements
- Must: On manual rule add, show a warning if the domain already exists.
- Must: The warning offers a choice: cancel or replace the existing rule.
- Must: If replacing, the new rule overwrites the existing one for that domain.
- Should: Warning text clearly states a duplicate domain rule was found.
- Should: Warning is shown before saving to avoid unnecessary writes.
- Could: Show a link/short hint to the existing rule (for example, the rule name or domain).

## Risks / questions
- What exact warning text should be used.
- Should the rule list treat domains case-insensitively (usually yes).
- How to handle subdomains (strict match or normalization).

## Plan (steps)
- Define duplicate check logic for domain input.
- Add a warning to the rule creation form.
- Validate confirm/cancel flows.

## Scope note
- This task implements duplicate warning for manual rule creation only.
- Duplicate warning for domain edits is deferred to `IMPROVE-03` because the current UI does not support editing rule domains yet.

## Changelog / Decisions
- 2026-02-22: Scope clarified to manual add flow only; edit-domain duplicate handling remains in `IMPROVE-03`.
- 2026-02-22: Duplicate detection is case-insensitive and returns the original stored key for replacement.
- 2026-02-22: UX pattern uses native `confirm()` with Cancel/OK (replace) before writing to storage.
- 2026-03-29: Manual verification completed in Chrome popup flow; duplicate manual add shows replace/cancel prompt and replace path works as expected.

## Instruction for AI
Draft warning text (English) and propose the UX choice pattern (Cancel/Replace buttons, modal vs inline alert).
