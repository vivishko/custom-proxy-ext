# IMPROVE-12: Colorize proxy explanation row

## Context / why

The proxy status row on the main popup screen always uses a neutral visual style.
Users can read the text, but they cannot instantly answer the main question:
whether traffic is currently routed through a proxy or not.

## Goals

- Add binary visual semantics for the proxy status row:
  active proxy path vs non-proxy path.
- Keep current UX behavior and wording stable (no flow changes, no extra clicks).
- Preserve readability and avoid aggressive styling.

## Non-goals

- Redesign popup layout, toggles, or table structure.
- Change proxy routing logic or storage schema.
- Introduce dark/light theming in this task.

## User scenarios

- User opens popup and immediately sees whether traffic is going through proxy (green)
  or not (neutral).
- User switches Global/Only-this-page toggles and status row color updates with status text.
- User has no active domain (internal browser page) and sees a neutral informational state.

## Requirements

- Must: status row uses only two tones:
  - active (green): proxy path is active.
  - inactive (neutral): direct/no-proxy/no-domain.
- Must: all existing status texts still render and remain readable.
- Must: no regressions in toggle/select behavior.
- Should: no change in popup layout dimensions.
- Could: add short helper text variants later if needed.

## Risks / questions

- Overly strong colors may reduce readability in compact popup UI.
- Random/rule-based proxy must still be treated as "active" (green), while
  NO_PROXY and DIRECT_* rules remain inactive.

## Plan (steps)

1. Update roadmap row to `🟠 in_progress` and bind spec link to this file.
2. Add binary tone mapping in popup status renderer (`ui-render.js`) based on effective routing.
3. Extend popup CSS with `active/inactive` styles for `.status-display`.
4. Run quality checks (`lint`, `test`, `check:mv3`).
5. Document final decisions in changelog.

## Instruction for AI

- Keep logic changes minimal and localized to popup status rendering.
- Use semantic class/data-attribute state tokens instead of hardcoded inline styles.
- Do not alter storage keys or proxy application behavior.

## Changelog / Decisions

- 2026-03-29: Task started. Added visual tone states for proxy status row based on effective mode (info/direct/global/page/rule) while preserving existing status text and behavior.
- 2026-03-30: Implemented tone mapping in `extension/popup/ui-render.js` and CSS state variants in `extension/popup.css`; `npm run lint`, `npm test`, and `npm run check:mv3` passed.
- 2026-04-11: Corrected spec and implementation to binary color semantics by product decision: green only for proxy-active routing, neutral for direct/no-proxy/no-domain. Updated renderer and CSS to `active/inactive` tones.
- 2026-04-11: Manual verification completed in popup (global/per-page/direct/no-domain/rule states). Task marked done and `done_date` set in roadmap.
