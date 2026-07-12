# IMPROVE-08. Rules search

## Context / why

Rules pagination keeps the table manageable, but finding a specific domain or proxy still requires paging manually. A small search control should make rule lookup direct without changing storage schema.

## Goals

- Add text search across site rules.
- Filter by domain, rule type, and proxy name where applicable.
- Keep pagination consistent with filtered results.

## Non-goals

- Full sorting/filtering controls; that remains `IMPROVE-10`.
- Searching proxies table.
- Persisting search text across popup sessions.

## User scenarios

- User types part of a domain and sees matching rules only.
- User searches for a proxy name and sees rules that use that proxy.
- User clears search and returns to the normal paginated rule list.

## Requirements

- Must: Add a search input on the Rules screen.
- Must: Search case-insensitively across domain, rule type, and `proxyName`.
- Must: Reset/clamp pagination when search text changes.
- Must: Show an empty state when no rules match.
- Should: Keep existing import/add/edit/delete pagination behavior intact.
- Should: Cover filtering helpers with unit tests.

## Risks / questions

- Search and pagination state can interact badly if current page is beyond the filtered page count.
- Search should not change stored rules or import/export output.

## Plan (steps)

1. Add pure filtering helper for site-rule entries.
2. Add search input markup/styles on Rules screen.
3. Integrate filtered entries with existing rules pagination.
4. Reset current rules page on search input changes.
5. Add unit tests for search matching and pagination with filtered results.

## Changelog / Decisions

- 2026-07-12: Spec created and task started; roadmap status moved to `in_progress`.
- 2026-07-12: Search fields are domain, rule `type`, and `proxyName` for `PROXY_BY_RULE` rules; matching is case-insensitive substring search.
- 2026-07-12: Add/edit save clears the current search so the saved rule remains visible and the existing post-save pagination behavior is preserved.
