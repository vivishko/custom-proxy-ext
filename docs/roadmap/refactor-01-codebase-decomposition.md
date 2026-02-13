# REFACTOR-01. Codebase decomposition

- Goal: Decompose monolithic popup.js (869 lines) and background.js (679 lines) into focused ES modules by responsibility.
- Value: Improve maintainability, testability, and code consistency; eliminate duplication; enable future unit testing.
- Priority: P1
- Complexity: L
- Dependencies: -
- Tag: -
- Notes / questions:
  - Full brainstorm plan: docs/ideas/2026-02-refactoring-plan.md
  - No behavior changes -- pure structural refactor.
  - popup.js lives in a single DOMContentLoaded closure (untestable, 20+ shared variables).
  - background.js has a 198-line god function (applyProxySettings) and 136-line auth handler.
  - Inconsistent STORAGE_KEYS usage in popup.js (raw strings vs constants).
  - Proxy dropdown construction duplicated 3 times in popup.js.
  - No test infrastructure exists yet; this refactor enables adding tests as a follow-up task.
