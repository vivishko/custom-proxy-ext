# Roadmap

Single tracking table. Each feature links to a detail file in `docs/roadmap/`.

| ID | Title | Tag | Priority | Complexity | Status | Spec | Goal/Value | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | 01. Separate main screens | H1 | P0 | L | idea | docs/specs/01-separate-main-screens.md | Simplify main screen and split views | - |
| 02 | 02. Warn on duplicate rule | L3 | P0 | S | idea | docs/roadmap/02-warn-duplicate-rule-manual.md | Prevent accidental duplicate rules | - |
| 03 | 03. Rule editing + duplicate warning | M4 | P0 | M | idea | docs/roadmap/03-rule-editing-duplicate-warning.md | Enable edits while preventing duplicates | 02 |
| 04 | 04. Import rules duplicate handling | H3 | P0 | L | idea | docs/roadmap/04-import-rules-duplicate-handling.md | Prevent duplicate rule imports | 02, 03 |
| 05 | 05. Import proxies duplicate handling | H4 | P0 | L | idea | docs/roadmap/05-import-proxies-duplicate-handling.md | Prevent duplicate proxy imports | 09 |
| 06 | 06. Proxy delete warning flow | H2 | P0 | L | idea | docs/roadmap/06-proxy-delete-rule-warning.md | Handle rule dependencies on proxy delete | 03 |
| 07 | 07. Rules table pagination | M1 | P1 | M | idea | docs/roadmap/07-rules-table-pagination.md | Limit rules table to 10 rows | - |
| 08 | 08. Rules search | M5 | P1 | M | idea | docs/roadmap/08-rules-search.md | Quickly find rules by text | 07 |
| 09 | 09. Proxies table pagination | M2 | P1 | M | idea | docs/roadmap/09-proxies-table-pagination.md | Limit proxies table to 10 rows | - |
| 10 | 10. Rule sorting and filters | M3 | P2 | M | idea | docs/roadmap/10-rule-sorting-filters.md | Improve rule discovery and control | 07, 08 |
| 11 | 11. Enable proxy toggle | L1 | P2 | S | idea | docs/roadmap/11-enable-proxy-toggle.md | Replace checkbox with toggle for clarity | 01 |
| 12 | 12. Colorize proxy explanation | L2 | P2 | S | idea | docs/roadmap/12-colorize-proxy-explanation-row.md | Make proxy explanation easier to scan | - |
| 13 | 13. Proxies left of rules | N1 | P2 | S | idea | docs/roadmap/13-proxies-left-of-rules.md | Reorder UI columns for proxies | 01 |
| 14 | 14. UI style refresh | H5 | P2 | L | idea | docs/roadmap/14-ui-style-refresh.md | Explore a new visual style | 01, 13 |
| 15 | 15. Dark/light theme | N3 | P2 | S | idea | docs/roadmap/15-dark-light-theme.md | Add theme toggle for comfort | 14 |
| 16 | 16. Onboarding | N2 | P2 | S | idea | docs/roadmap/16-onboarding.md | Guide new users through setup | 01, 14 |
