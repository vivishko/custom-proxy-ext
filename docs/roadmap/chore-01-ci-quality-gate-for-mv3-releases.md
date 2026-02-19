# CHORE-01. CI quality gate for MV3 releases

- Goal: Add a standard pre-release CI workflow for quality and safety.
- Value: Prevent shipping changes that fail lint, tests, MV3 static checks, or security checks.
- Priority: P0
- Complexity: M
- Dependencies: TEST-01
- Tag: Q2
- Notes / questions:
  - Keep CI fast with caching and clear job separation.
  - Gate release readiness on CI pass status.
