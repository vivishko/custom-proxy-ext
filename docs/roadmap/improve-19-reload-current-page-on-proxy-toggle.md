# IMPROVE-19. Reload current page on proxy toggle (H8)

- Goal: Automatically reload the current tab when Global proxy or Only this page proxy toggles are changed.
- Value: Users can immediately verify whether the site is now going through proxy without manual refresh.
- Priority: P1
- Complexity: S
- Dependencies: -
- Tag: H8
- Notes / questions:
  - Define guardrails for special pages (`chrome://`, extension pages) where reload is not allowed.
