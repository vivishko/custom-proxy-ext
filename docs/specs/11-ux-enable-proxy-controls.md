# 11. UX: Enable Proxy controls

## Context / why
Current proxy mode control uses two checkboxes: "Enable Proxy" and "Enable only on this page". The relationship between these modes is unclear, and users cannot easily see where the proxy is active. We need a more explicit UX that shows the active mode and scope.

## Goals
- Make proxy controls unambiguous with Global and Only this page toggles.
- Simplify the current checkbox UX and clarify the override relationship.
- Preserve proxy selection for Global and Only this page.
- Update status text to explicitly describe the active mode and domain.

## Non-goals
- Full popup redesign.
- Changes to proxy storage logic in chrome.storage.sync.
- Introducing new proxy modes beyond Global and Only this page.

## User scenarios
- The user enables Global and sees which proxy is active everywhere.
- The user enables Only this page, selects a proxy for the current domain, and Global continues for all other domains.
- The user disables both toggles and sees that proxy is off.

## Requirements
- Must: Global and Only this page allow selecting a proxy from the list.
- Must: Only this page overrides Global for the current domain.
- Must: Rules still have higher priority than Only this page.
- Must: The status line explicitly shows the active mode and domain.
- Should: Mode switching does not hide controls, it only disables them.
- Should: If there are no proxies, Global/Only this page modes are disabled and show a small error hint on interaction.
- Should: Only this page is disabled for tabs without a valid domain.
- Should: Move all user-facing strings into a language map to enable future i18n.
- Could: Add a short helper text under the modes explaining the effect.

## Proposed UX
- Two toggles: Global and Only this page.
- Two proxy selectors: one for Global and one for Only this page.
- For Only this page, show the domain next to the toggle (for example, "Only this page: example.com").
- If there are no proxies, show "No proxies" and disable both toggles.

## Copy (EN)
Toggles:
- "Global proxy"
- "Only this page"

Status line examples:
- Both toggles off: "Proxy: DIRECT (no proxy enabled)"
- Global: "Proxy: <proxyName> (all sites)"
- Only this page: "Proxy: <proxyName> (only for <domain>)"

Helper text (optional):
- "Only this page applies only to this domain; Global still applies elsewhere."

Disabled state hint (if no proxies):
- "Add a proxy to enable this toggle."

No-domain hint:
- "This extension works only on pages with a domain."

## Storage mapping
- Off:
  - globalProxyEnabled = false
  - temporaryProxySites = {}
  - temporaryDirectSites = {} (clear on mode switch; not a mode)
- Global:
  - globalProxyEnabled = true
  - lastSelectedProxy = selected proxy
  - temporaryProxySites = {} (avoid per-page overrides)
- Only this page:
  - globalProxyEnabled = true (global stays on for other domains)
  - temporaryProxySites = { [currentDomain]: selectedProxyName }
  - lastSelectedProxy = selected proxy (for returning to Global)
  - temporaryDirectSites cleared for current domain

## UI state rules
- If there is no active domain (for example, chrome://), disable Only this page.
- Switching modes should not remove proxies or alter site rules.
- Update the status line immediately after mode changes.
- Status priority: Rules, then Only this page, then Global.
- Strings should be sourced from a language map (i18n-ready object).

## i18n structure (proposal)
Suggested file: `strings.js` (or `i18n.js`) in the project root, imported by popup.

Example structure:
```js
export const STRINGS = {
  en: {
    toggles: {
      global: "Global proxy",
      onlyThisPage: "Only this page",
    },
    status: {
      direct: "Proxy: DIRECT (no proxy enabled)",
      global: "Proxy: {proxyName} (all sites)",
      onlyThisPage: "Proxy: {proxyName} (only for {domain})",
      noDomain: "This extension works only on pages with a domain.",
    },
    hints: {
      noProxies: "Add a proxy to enable this toggle.",
      onlyThisPageInfo:
        "Only this page applies only to this domain; Global still applies elsewhere.",
    },
  },
};
```

Notes:
- Add a small template helper to replace {proxyName} / {domain} in strings.
- Store the active locale in a simple constant (for now, DEFAULT_LOCALE = "en").
- Keep one language key (en) for now, but structure supports new locales.

## Risks / questions
- Should the last selected toggle states persist across sessions?

## Plan (steps)
1. Update popup markup for the two toggles and two selectors.
2. Wire the toggles to storage (globalProxyEnabled, temporaryProxySites).
3. Update status text and its priority rules.
4. Manual verification on multiple domains.

## Instruction for AI
Describe the recommended UI option (English copy) and map it to storage keys.

## Changelog / Decisions
- 2026-02-06: Spec created; UX exploration needed for mode selection (Global / Only this page).
- 2026-02-06: Added toggle-based UX, English copy, and storage mapping.
