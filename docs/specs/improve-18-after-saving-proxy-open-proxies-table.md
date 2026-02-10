# IMPROVE-18. After saving proxy, open proxies table

## Context / why
After saving a proxy from the creation form, the current flow only clears the form. Users do not get immediate confirmation in the proxies list and must manually navigate back, which adds friction and uncertainty.

## Goals
- Navigate to the proxies table view immediately after a successful proxy save.
- Keep clear success feedback so the user understands save completed.
- Reduce extra clicks in the create-proxy flow.

## Non-goals
- Redesigning the full proxies screen layout.
- Changing proxy validation rules or storage schema.
- Introducing bulk-create behavior.

## User scenarios
- User creates a new proxy, clicks Save, and lands on the proxies table where the new row is visible.
- User creates a proxy from the form and sees a success message after navigation.
- User attempts to save invalid data and remains on the form with validation errors (no navigation).

## Requirements
- Must: After successful save, switch view to the proxies table screen.
- Must: New proxy is persisted before navigation occurs.
- Must: On validation/save error, do not navigate; show existing error handling in form.
- Should: Show success feedback on the table screen (toast or inline banner).
- Should: Preserve current sorting/filtering defaults for the proxies table.
- Could: Highlight the newly created proxy row briefly after navigation.

## Risks / questions
- Success feedback placement: toast vs inline message on table screen.
- If duplicate-name checks are added later, ensure navigation happens only on true success.

## Plan (steps)
1. Locate proxy save handler in popup flow.
2. Update success path to trigger navigation to proxies table.
3. Add lightweight success feedback after navigation.
4. Verify behavior for success, validation failure, and storage failure paths.

## Instruction for AI
Implement navigation to the proxies table only after successful save, preserve current error behavior, and add minimal success feedback.

## Changelog / Decisions
- 2026-02-09: Spec created from roadmap idea; default direction is success-only navigation with lightweight confirmation on the table view.
