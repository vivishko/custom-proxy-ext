# IMPROVE-06. Proxy delete warning flow

## Context / why
Deleting a proxy can silently remove or break related site rules when those rules point to that proxy. Users need a clear warning and a predictable outcome that does not leave rules in an invalid state.

## Goals
- Warn users when a proxy is referenced by site rules.
- Clearly explain the effect of deletion before confirmation.
- Keep site rules valid after deletion (no dangling `proxyName` references).

## Non-goals
- Bulk reassign wizard to another proxy.
- Non-native custom modal UI.

## User scenarios
- User deletes a proxy that is not used in any site rule and sees a simple confirmation.
- User deletes a proxy used by one or more site rules and sees an explicit warning with impacted domains and the exact post-delete behavior.

## Requirements
- Must: Before deleting a proxy, detect dependent site rules with `type = PROXY_BY_RULE` and matching `proxyName`.
- Must: If dependencies exist, confirmation text must include impacted rule count and affected domains.
- Must: On confirmed delete, dependent rules must be converted to `NO_PROXY` instead of being left dangling.
- Must: Temporary per-site proxy mappings that reference the deleted proxy must be removed.
- Should: Confirmation text should be concise when many domains are affected (preview list + count).
- Could: Show a short post-action feedback message with how many rules were updated.

## Risks / questions
- Native `confirm()` UI is limited and not stylable; long domain lists must be truncated.
- If global selected proxy is deleted, current behavior relies on existing fallback logic in controls/background.

## Plan (steps)
- Add pure helper functions for dependency detection and deletion-state transformation.
- Use helper output to build targeted confirmation text.
- Apply transformed state atomically in storage writes.
- Add unit tests for delete with and without dependent rules.

## Changelog / Decisions
- 2026-04-11: Deletion flow changed from cascade rule deletion to safe conversion (`PROXY_BY_RULE` -> `NO_PROXY`) for dependent rules.
- 2026-04-11: Warning message now distinguishes cases with and without dependent rules and lists impacted domains (trimmed preview).
- 2026-04-11: Temporary per-page proxy mappings referencing deleted proxy are removed during the same delete flow.

## Instruction for AI
If scope expands, prefer keeping data transformations in pure functions and cover them with unit tests before changing UI interactions.
