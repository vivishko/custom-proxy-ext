# IMPROVE-13. Proxies left of rules

## Context / why
On the main popup screen, quick navigation buttons are currently shown as `Rules` then `Proxies`.
For proxy-first workflows, this ordering weakens visual hierarchy and adds a small navigation mismatch with user intent.

## Goals
- Place `Proxies` to the left of `Rules` on the main screen quick actions row.
- Keep existing navigation behavior and screen IDs unchanged.
- Minimize visual regressions in desktop and narrow popup sizes.

## Non-goals
- Redesigning rules/proxies screens.
- Changing data flow, storage schema, or routing logic.
- Adding new navigation destinations.

## User scenarios
- User opens popup and sees proxy management as the first quick action on the left.
- User navigates to `Proxies`/`Rules` with the same click behavior as before.
- User uses a narrow popup width and action buttons remain usable/readable.

## Requirements
- Must: Main screen quick actions order is `Proxies` (left) then `Rules` (right).
- Must: Existing `data-screen-target` navigation continues to work without logic changes.
- Must: No regressions in rule/proxy CRUD flows.
- Should: Keep button styling and spacing visually consistent with current UI.
- Should: Keep quick actions usable at narrow popup widths.
- Could: Add explicit responsive wrapping for action row on small widths.

## Risks / questions
- If users are already trained to current ordering, change can temporarily slow muscle memory.
- Narrow widths can cause cramped controls if layout is not responsive.

## Plan (steps)
1. Move IMPROVE-13 to `🟠 in_progress` in roadmap and set start date.
2. Reorder quick action buttons in `extension/popup.html`.
3. Add minimal responsive rule for action row in `extension/popup.css`.
4. Run `npm run lint`, `npm test`, `npm run check:mv3`.
5. Complete manual verification in `chrome://extensions` before marking done.

## Instruction for AI
Implement only layout ordering/responsive adjustments required for this task. Do not change business logic, storage, or proxy/rule behavior.

## Changelog / Decisions
- 2026-04-13: Task started. Spec created and roadmap link switched to this file.
- 2026-04-13: Main screen quick actions reordered to `Proxies` then `Rules` by swapping button order in HTML while preserving `data-screen-target` mapping.
- 2026-04-13: Added narrow-popup CSS fallback so action buttons stack vertically under small widths to keep controls readable on mobile-sized popup dimensions.
- 2026-05-07: Verified implementation against spec with lint, tests, MV3 static check, and local popup visual sanity check. Marked task done and unblocked `IMPROVE-14`.
