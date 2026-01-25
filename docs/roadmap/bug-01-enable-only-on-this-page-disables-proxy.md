# Bug-01. Enable only on this page disables proxy

- Goal: When user selects "Enable only on this page", keep proxy enabled for current domain and disable elsewhere.
- Value: Matches intended UX and prevents misleading "temporarily disabled" state for the active page.
- Priority: P0
- Complexity: M
- Dependencies: -
- Tag: B1
- Notes / questions:
  - Confirm whether current rule is inverted (disable current domain vs enable current domain).
  - Define expected status text when per-page enable is active.
