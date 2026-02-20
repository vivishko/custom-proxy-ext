# REFACTOR-02. Decompose popup.html into components (R1)

- Goal: Break `extension/popup.html` into clear UI components/sections with explicit ownership.
- Value: Reduce template complexity and make popup UI changes safer and faster.
- Priority: P1
- Complexity: M
- Dependencies: -
- Tag: R1
- Notes / questions:
  - Decide split strategy: static partial templates vs render helpers in JS.
  - Keep current popup behavior and selectors backward-compatible during migration.
