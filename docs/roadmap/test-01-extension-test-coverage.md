# TEST-01. Extension test coverage baseline

- Goal: Add baseline automated tests for critical extension logic and user-impacting flows.
- Value: Catch regressions early and make refactoring/feature work safer.
- Priority: P0
- Complexity: M
- Dependencies: REFACTOR-01
- Tag: Q1
- Notes / questions:
  - Start with high-value unit tests for pure modules.
  - Add pragmatic integration tests for critical popup/background flows where stable.
