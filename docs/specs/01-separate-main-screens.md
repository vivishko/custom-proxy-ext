# 01. Separate main screens

## Context / why
The main screen currently mixes the primary on/off action with rules and proxies tables, which makes the entry point feel crowded and distracts from the core toggle.

## Goals
- Keep the first screen focused on enabling/disabling the proxy.
- Move rules and proxies into dedicated screens.
- Make adding a proxy a clear, focused flow.

## Non-goals
- Redesigning rules/proxy data models.
- Adding new proxy types or rule behaviors.

## User scenarios
- User opens the extension and immediately sees the proxy on/off control.
- User navigates to Rules to view/edit rules without leaving the popup context.
- User navigates to Proxies and clicks a large "+" to create a proxy.

## Requirements
- Must: Main screen shows only the enable/disable control and navigation to Rules/Proxies.
- Must: Rules screen lists rules and existing actions (edit, delete, import/export as applicable).
- Must: Proxies screen lists proxies and provides a large "+" entry point.
- Should: Navigation between screens is reversible and clear (back button or tabs).
- Should: Preserve current data state when moving between screens.
- Could: Provide quick status summary (counts of rules/proxies) on the main screen.

## Risks / questions
- Best navigation pattern for a small popup (tabs vs routed screens vs stacked panels).
- Whether the proxy toggle should remain visible on other screens.
- How to handle deep actions (edit rule, add proxy) without exceeding popup size limits.

## Plan (steps)
- Map current UI layout and identify components to split.
- Choose navigation pattern (tabs, nav buttons, or routed panels).
- Implement screen container and move Rules/Proxies into their screens.
- Add Proxy creation screen with a prominent "+" CTA.
- Validate navigation flow and state persistence.

## Instruction for AI
Draft the navigation structure and list the UI components to move or refactor.
