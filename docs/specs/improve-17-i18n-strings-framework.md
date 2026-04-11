# IMPROVE-17. i18n strings framework

## Context / why

The popup contains user-facing strings that are currently resolved directly from a single static dictionary. We need a stable i18n foundation first, without a risky bulk migration of all UI text in one change.

## Goals

- Introduce a single lookup entrypoint for localized strings.
- Add locale dictionaries for `en` and `ru`.
- Ensure reliable fallback to default locale when key/locale is missing.
- Integrate the new framework in a small proof-of-use scope only.

## Non-goals

- Full migration of all popup/background/user-visible strings.
- Introducing locale settings UI in this task.
- Runtime translation loading from external sources.

## User scenarios

- As a user with `ru-RU` browser locale, I get localized text for migrated keys.
- As a user with unsupported locale (for example `de-DE`), I still get valid English text instead of empty labels.
- As a developer, I can request a localized string by key from one API and get consistent fallback behavior.

## Requirements

- Must: provide one central API for string lookup by key path.
- Must: support at least `en` and `ru` dictionaries.
- Must: fallback to `DEFAULT_LOCALE` when locale or key is missing.
- Must: cover fallback/lookup behavior with unit tests.
- Should: keep existing modules untouched except 1-2 safe proof-of-use integrations.
- Could: add helper for resolving browser locale (`xx-YY` -> `xx`).

## Risks / questions

- Partial migration means mixed direct literals and i18n keys will coexist temporarily.
- Russian translations in this phase are baseline and may be refined later by product copy review.

## Plan (steps)

1. Move roadmap task to `in_progress` and set `started_date`.
2. Implement i18n lookup + locale resolution + fallback in `extension/strings.js`.
3. Integrate lookup API in `popup/proxy-controls.js` and `popup/ui-render.js`.
4. Add unit tests for locale resolution and key fallback behavior.
5. Run `lint`, `test`, `check:mv3`.

## Changelog / Decisions

- 2026-04-11: Scope fixed as infrastructure-only to minimize merge conflicts and review risk.
- 2026-04-11: Proof-of-use limited to `proxy-controls` and `ui-render`; full text migration deferred.
- 2026-04-11: Added central lookup API (`getString`) with locale resolver (`resolveLocale`) and browser locale helper (`getCurrentLocale`).
- 2026-04-11: Added baseline `ru` dictionary; fallback-to-`en` is verified with unit tests for missing locale and missing key cases.
