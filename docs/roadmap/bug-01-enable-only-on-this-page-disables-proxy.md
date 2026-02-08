# BUG-01. Enable only on this page disables proxy

- Goal: Separate global and per-page toggles so "Enable only on this page" can override global mode with its own proxy choice.
- Value: Keeps current-domain proxying intact, allows both toggles on, and removes misleading "temporarily disabled" status.
- Priority: P0
- Complexity: M
- Dependencies: -
- Tag: B1
- Notes / questions:
  - Ensure per-page toggle is never blocked by global toggle.
  - Define expected status text when per-page enable is active and global is also on.
  - Confirm per-page mode keeps only one active domain.
