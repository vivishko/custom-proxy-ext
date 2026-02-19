# CHORE-01. CI quality gate for MV3 releases

## Context / why
Even with tests, releases remain risky without enforced automation in CI. The project needs a standard pre-release quality gate tailored to Manifest V3 extension constraints.

## Goals
- Add a CI workflow that enforces release quality gates.
- Run lint, tests, MV3 static validation, and security checks in CI.
- Make failures explicit and block release progression.

## Non-goals
- Expanding test scope itself (covered by TEST-01).
- Introducing a mandatory build pipeline when no build artifacts are needed.
- Publishing tags/releases automatically in this task.

## User scenarios
- Developer opens a PR and sees clear CI job status for quality/security.
- A manifest/path/permission regression is caught by MV3 static checks.
- A vulnerable dependency or leaked secret fails CI before release.

## Requirements
- Must: Add workflow(s) in `.github/workflows/` for pre-release quality gates.
- Must: Run `lint`.
- Must: Run `tests`.
- Must: Run MV3 static checks (manifest schema sanity, service worker/popup path validity, permission sanity).
- Must: Run security checks (dependency audit and secret scanning).
- Must: CI fails on any gate failure.
- Should: Use caching to keep runtime practical.
- Should: Separate jobs logically and provide readable logs.
- Could: Add optional `build` step only if build artifacts are introduced later.

## Risks / questions
- Security scanners may require allowlists/tuning to reduce false positives.
- MV3 static checks may need custom scripts where generic tools are insufficient.
- CI runtime can grow as checks are added; balance strictness and speed.

## Plan (steps)
1. Define workflow structure and trigger policy (PR/push/release branch).
2. Add lint/test jobs wired to repository commands.
3. Add MV3 static validation job/script.
4. Add security checks job (audit + secrets).
5. Document CI gates and local parity commands.

## Instruction for AI
Build a strict but maintainable CI gate focused on MV3 release safety and clear failure visibility.

## Changelog / Decisions
- 2026-02-19: Created by splitting former unified TEST-01 scope into separate test and CI tasks.
