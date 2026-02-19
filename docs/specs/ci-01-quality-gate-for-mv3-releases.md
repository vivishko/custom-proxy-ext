# CI-01. CI quality gate for MV3 releases

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
- Must: Run package verification immediately before release zip creation in `.github/workflows/release.yml`.
- Must: Package verification must assert:
- Must: zip payload contains only allowed release files.
- Must: no `node_modules/`, tests, CI/config/dev artifacts, secrets, `.env*`, or unrelated files in package.
- Must: `manifest.json` version matches release tag version.
- Must: package size limits are checked (with explicit threshold in script/workflow).
- Should: Reproducible build target: same input commit should produce identical package contents/checksum.
- Should: Reuse the same package-verification script in CI (dry-run) to catch issues before tag release.
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
- 2026-02-19: Added package-verification requirements; placement decision:
- 2026-02-19: hard gate in `release.yml` right before zip packaging, plus CI dry-run check in `ci.yml` for early feedback.
- 2026-02-19: Implemented `.github/workflows/ci.yml` with `quality`, `mv3-static`, and `security` jobs.
- 2026-02-19: Implemented MV3 static validation script: `scripts/check-mv3.mjs` (`npm run check:mv3`).
- 2026-02-19: Implemented package verification script: `scripts/verify-package.mjs` (`npm run check:package`).
- 2026-02-19: Implemented release packager: `scripts/build-release-package.mjs`; `release.yml` now verifies payload before zip and builds package via script.
