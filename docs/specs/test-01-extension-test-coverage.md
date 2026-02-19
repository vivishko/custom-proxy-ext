# TEST-01. Extension test coverage baseline

## Context / why
After refactoring, modules are more testable, but the project still lacks a reliable automated test baseline. This increases regression risk in proxy logic and popup/background flows.

## Goals
- Introduce practical unit tests for pure logic.
- Add integration tests for the most critical extension flows where feasible.
- Define a minimal stable baseline that can grow incrementally.

## Non-goals
- Building a full end-to-end browser automation suite in the first step.
- Forcing very high coverage thresholds immediately.
- Designing CI policy itself (covered by CHORE-01).

## User scenarios
- Developer changes validation/helpers and unit tests catch regressions.
- Developer changes popup/background wiring and integration tests catch broken core flows.
- New features can extend the baseline instead of starting from zero.

## Requirements
- Must: Add unit tests for pure modules/functions where isolation is straightforward.
- Must: Cover critical decision paths for proxy/rule-related logic.
- Must: Add integration tests for high-value scenarios across popup/background boundaries where feasible.
- Must: Keep tests deterministic and runnable locally.
- Should: Keep test structure aligned with module boundaries introduced by REFACTOR-01.
- Should: Add basic fixtures/mocks for Chrome APIs used in tested paths.
- Could: Add lightweight coverage reporting and track growth over time.

## Risks / questions
- Browser-extension integration tests can be brittle; scope should start with stable, high-signal flows.
- Mocking Chrome APIs may require a small custom harness.
- Some runtime behaviors may remain manual-only initially.

## Plan (steps)
1. Select test framework/tooling compatible with plain ES modules.
2. Add unit tests for validation/helpers and core pure logic.
3. Add integration tests for key popup/background interaction flows.
4. Document local test commands and expected scope.

## Instruction for AI
Implement a minimal but meaningful test baseline first; optimize for reliability and regression detection.

## Changelog / Decisions
- 2026-02-19: Task split from former unified TEST-01 scope (tests + CI). This spec now covers tests only.
