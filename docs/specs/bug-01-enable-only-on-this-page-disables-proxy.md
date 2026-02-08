# BUG-01. Enable only on this page disables proxy

## Context / why
"Enable only on this page" should work independently of "Enable Proxy": the proxy is active only for the current domain and disabled for all others. The previous logic was tied to the global toggle, which disabled the per-page control and showed status text like "Proxy temporarily disabled for ...", implying the proxy was disabled for the current domain. This conflicted with expected behavior.

## Goals
- Separate logic for "Enable Proxy" and "Enable only on this page".
- Allow both controls to be enabled at the same time.
- When "Enable only on this page" is active, proxy applies only to the current domain and overrides global mode.
- Add proxy selection for the "Enable only on this page" mode.
- Update status/explanatory text to match the actual mode.

## Non-goals
- Full redesign of the proxy status UI.
- New switching modes beyond "global" and "only on this page".

## User scenarios
- User enables "Enable Proxy" and "Enable only on this page": proxy is active only on the current domain and disabled elsewhere.
- User enables only "Enable only on this page": proxy is active on the current domain and globally off for others.
- User selects a dedicated proxy for "Enable only on this page".
- User sees a status that explicitly states "Enabled for current domain, disabled elsewhere".

## Requirements
- Must: "Enable only on this page" works independently of "Enable Proxy".
- Must: Both controls can be enabled simultaneously.
- Must: When "Enable only on this page" is active, the current domain receives an active proxy.
- Must: When "Enable only on this page" is active, all other domains get DIRECT even if global mode is enabled.
- Must: User can choose a proxy that applies only to the current page.
- Should: "Enable only on this page" keeps a single active domain and clears the previous one.
- Should: When the tab closes, the active per-page domain is cleared automatically.
- Must: The status line must not claim proxy is disabled for the current domain.
- Should: Status text clearly shows the domain for which the proxy is active.
- Could: Provide a short hint on how to return to global mode.

## Risks / questions
- Where exactly is the "temporarily disabled" logic formed: rule, UI, or service worker?
- Should existing user rules be respected (for example, when a rule already exists for the domain)?

## Plan (steps)
- Find where "Enable Proxy" blocks "Enable only on this page".
- Fix global proxy application so per-page mode overrides it.
- Add proxy selection for per-page mode.
- Update the status text.
- Test on several domains.

## Instruction for AI
Describe expected status text (English) and where logic should be fixed (rules, UI, or service worker).

## Changelog / Decisions
- 2026-02-06: Core per-page proxy logic implemented (including proxy selection and global override). Remaining UX note: the current checkbox combination is not user-friendly and needs a dedicated UI/status redesign.
