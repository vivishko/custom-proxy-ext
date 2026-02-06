# 02. Warn on duplicate rule (manual)

## Context / why
Manual rule creation or editing can silently create duplicates for the same domain, which leads to confusion and redundant entries in the rules list.

## Goals
- Warn the user about a duplicate domain rule during manual add or edit.
- Reduce accidental duplicates in the rules list.

## Non-goals
- Handling duplicates on import.
- Automatic changes without user choice.

## User scenarios
- User enters a domain that already exists, sees a warning, and chooses "Replace rule".
- User edits an existing rule and changes its domain to one that already exists, gets a warning and chooses cancel or replace.

## Requirements
- Must: On manual rule add, show a warning if the domain already exists.
- Must: On manual rule edit, show a warning if the new domain already exists (excluding the current rule).
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
- Add a warning to the rule editing form.
- Validate confirm/cancel flows.

## Instruction for AI
Draft warning text (English) and propose the UX choice pattern (Cancel/Replace buttons, modal vs inline alert).
