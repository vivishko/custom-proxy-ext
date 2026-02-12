# IMPROVE-19. Reload current page on proxy toggle

## Context / why
When users switch Global proxy or Only this page proxy modes, the currently opened page may still show content loaded before the new proxy state was applied. This creates ambiguity about whether the toggle worked.

## Goals
- Reload the current tab automatically after proxy mode toggles are changed.
- Make proxy effect visible immediately without requiring manual refresh.
- Keep behavior predictable and safe for unsupported pages.

## Non-goals
- Reloading all tabs/windows.
- Changing proxy decision logic itself.
- Redesigning toggle UI labels or layout.

## User scenarios
- User enables Global proxy and the current page reloads once, reflecting the new route.
- User enables Only this page and the current tab reloads so user can immediately verify behavior.
- User toggles mode on a restricted page (`chrome://...`) and no reload is attempted; UI remains stable.

## Requirements
- Must: Trigger current-tab reload after successful update of Global proxy toggle state.
- Must: Trigger current-tab reload after successful update of Only this page toggle state.
- Must: Reload only the active tab in the current window.
- Must: Do not attempt reload on unsupported URLs/pages (browser internal pages, extension pages, etc.).
- Must: If storage/proxy update fails, do not reload; keep error handling path.
- Should: Avoid double reload when multiple related state writes happen in one action.
- Should: Keep UX responsive (no blocking spinner required unless already present).
- Could: Add a lightweight note in UI text that page is reloading to apply settings.

## Risks / questions
- Some websites may lose unsaved form state on reload.
- Toggle changes in quick succession may trigger repeated reloads; consider simple debounce/guard.
- Confirm whether reload should be skipped for pinned/non-http(s) tabs.

## Plan (steps)
1. Identify success paths for Global and Only this page toggle handlers in popup flow.
2. Add helper to reload active tab only for allowed URLs.
3. Call helper once per successful toggle action (after state persistence).
4. Verify behavior on http/https pages and restricted pages (`chrome://`, `chrome-extension://`).

## Instruction for AI
Implement safe, single-shot active-tab reload after successful proxy-toggle actions, with URL guardrails and no reload on failed writes.

## Changelog / Decisions
- 2026-02-10: Spec created; direction is to reload active tab only after successful toggle updates, with restricted-page guardrails.
- 2026-02-12: Implemented active-tab reload guarded to http/https URLs only, with error logging on failures.
- 2026-02-12: Moved reload trigger into background after proxy settings apply to avoid racing before proxy takes effect.
- 2026-02-12: Manual verification completed; behavior acceptable.
