# Roadmap

Single tracking table. Each feature links to a detail file in `docs/roadmap/`.

| ID | Title | Tag | Priority | Complexity | Status | created_date | started_date | done_date | Spec | Goal/Value | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMPROVE-19 | 19. Reload current page on proxy toggle | H8 | P1 | S | 🔵 planned | 2026-02-08 | - | - | docs/specs/improve-19-reload-current-page-on-proxy-toggle.md | Make proxy effect visible immediately after toggle | - |
| IMPROVE-02 | 02. Warn on duplicate rule | L3 | P0 | S | 🟣 idea | 2026-01-25 | - | - | docs/roadmap/improve-02-warn-duplicate-rule-manual.md | Prevent accidental duplicate rules | - |
| IMPROVE-07 | 07. Rules table pagination | M1 | P1 | M | 🟣 idea | 2026-01-25 | - | - | docs/roadmap/improve-07-rules-table-pagination.md | Limit rules table to 10 rows | - |
| IMPROVE-09 | 09. Proxies table pagination | M2 | P1 | M | 🟣 idea | 2026-01-25 | - | - | docs/roadmap/improve-09-proxies-table-pagination.md | Limit proxies table to 10 rows | - |
| IMPROVE-12 | 12. Colorize proxy explanation | L2 | P2 | S | 🟣 idea | 2026-01-25 | - | - | docs/roadmap/improve-12-colorize-proxy-explanation-row.md | Make proxy explanation easier to scan | - |
| IMPROVE-13 | 13. Proxies left of rules | N1 | P2 | S | 🟣 idea | 2026-01-25 | - | - | docs/roadmap/improve-13-proxies-left-of-rules.md | Reorder UI columns for proxies | IMPROVE-01 |
| IMPROVE-17 | 17. i18n strings framework | H6 | P1 | M | 🟣 idea | 2026-02-07 | - | - | docs/roadmap/improve-17-i18n-strings-framework.md | Add multi-language string support | - |
| IMPROVE-03 | 03. Rule editing + duplicate warning | M4 | P0 | M | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-03-rule-editing-duplicate-warning.md | Enable edits while preventing duplicates | IMPROVE-02 |
| IMPROVE-04 | 04. Import rules duplicate handling | H3 | P0 | L | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-04-import-rules-duplicate-handling.md | Prevent duplicate rule imports | IMPROVE-02, IMPROVE-03 |
| IMPROVE-05 | 05. Import proxies duplicate handling | H4 | P0 | L | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-05-import-proxies-duplicate-handling.md | Prevent duplicate proxy imports | IMPROVE-09 |
| IMPROVE-06 | 06. Proxy delete warning flow | H2 | P0 | L | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-06-proxy-delete-rule-warning.md | Handle rule dependencies on proxy delete | IMPROVE-03 |
| IMPROVE-08 | 08. Rules search | M5 | P1 | M | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-08-rules-search.md | Quickly find rules by text | IMPROVE-07 |
| IMPROVE-10 | 10. Rule sorting and filters | M3 | P2 | M | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-10-rule-sorting-filters.md | Improve rule discovery and control | IMPROVE-07, IMPROVE-08 |
| IMPROVE-14 | 14. UI style refresh | H5 | P2 | L | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-14-ui-style-refresh.md | Explore a new visual style | IMPROVE-01, IMPROVE-13 |
| IMPROVE-15 | 15. Dark/light theme | N3 | P2 | S | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-15-dark-light-theme.md | Add theme toggle for comfort | IMPROVE-14 |
| IMPROVE-16 | 16. Onboarding | N2 | P2 | S | 🔴 blocked | 2026-01-25 | - | - | docs/roadmap/improve-16-onboarding.md | Guide new users through setup | IMPROVE-01, IMPROVE-14 |
| IMPROVE-01 | 01. Separate main screens | H1 | P0 | L | 🟢 done | 2026-01-25 | 2026-01-25 | 2026-01-25 | docs/specs/improve-01-separate-main-screens.md | Simplify main screen and split views | - |
| BUG-01 | Bug-01. Enable only on this page disables proxy | B1 | P0 | M | 🟢 done | 2026-01-26 | 2026-02-01 | 2026-02-01 | docs/specs/bug-01-enable-only-on-this-page-disables-proxy.md | Separate global/per-page enable, add per-page proxy choice | IMPROVE-11 |
| IMPROVE-11 | 11. UX: Enable Proxy controls | H0 | P0 | M | 🟢 done | 2026-02-07 | 2026-02-07 | 2026-02-08 | docs/specs/improve-11-ux-enable-proxy-controls.md | Make proxy mode controls clear and user-friendly | - |
| IMPROVE-18 | 18. After saving proxy, open proxies table | H7 | P1 | S | 🟢 done | 2026-02-08 | 2026-02-11 | 2026-02-12 | docs/specs/improve-18-after-saving-proxy-open-proxies-table.md | Improve post-save flow by taking users to proxy list | - |
