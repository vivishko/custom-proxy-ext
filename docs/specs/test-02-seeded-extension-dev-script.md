# TEST-02. Seeded extension dev script

## Context / why
Manual extension verification currently requires repeatedly loading the extension and recreating proxy/rule data by hand. This slows down feature validation and makes manual checks inconsistent.

## Goals
- Add a local command that starts a browser with the unpacked extension loaded.
- Seed deterministic proxy, rule, and import-test data into extension storage or an equivalent setup path.
- Keep the browser open so the developer can manually verify popup behavior without repetitive data entry.

## Non-goals
- Full browser e2e assertions; this is covered by TEST-03.
- Replacing unit/integration tests.
- Shipping seed data in release payload.

## User scenarios
- Developer runs one command and opens the popup with predefined proxies already available.
- Developer can manually test import duplicate replace/skip flows using known fixture files.
- Developer can reset the seeded profile between runs for a clean verification state.

## Requirements
- Must: Provide an npm script for seeded manual verification.
- Must: Use an isolated temporary or repo-ignored browser profile so normal Chrome data is not modified.
- Must: Load a temporary copy of the unpacked extension generated from the repository root.
- Must: Provide deterministic seed data for common proxy/rule scenarios.
- Must: Document the command and what data it creates.
- Should: Include fixture files for proxy import duplicate replace/skip/error checks.
- Should: Avoid adding heavy dependencies if a reliable native script is enough.
- Could: Support a flag to keep or delete the seeded profile after exit.

## Risks / questions
- Chrome CLI extension loading can differ between installed Google Chrome and Playwright-managed Chromium.
- Writing directly to `chrome.storage.sync` requires an extension context; the implementation uses a dev-only seed module injected into a temporary extension copy.
- Seed data must not leak into release packages.

## Plan (steps)
1. Add fixture files for seeded proxies, rules, and duplicate import payloads.
2. Add a script that launches a browser profile with the unpacked extension loaded.
3. Seed extension storage through a reliable extension context.
4. Add npm script and README/docs instructions.
5. Verify the command on local Chrome/Chromium.

## Instruction for AI
Prioritize developer ergonomics and reliability. This task is higher priority than full e2e because it removes the immediate manual setup burden.

## Changelog / Decisions
- 2026-05-06: Task created as the high-priority setup step before full browser e2e automation.
- 2026-07-12: Started implementation; task status moved to `in_progress`.
- 2026-07-12: Added `npm run dev:seeded`, which creates a temporary extension copy/profile, injects a dev-only seed module, and launches Chrome/Chromium without adding runtime dependencies.
- 2026-07-12: Added deterministic seed fixtures under `examples/dev/` for proxies, site rules, duplicate replace/skip import checks, and duplicate validation-error checks.
- 2026-07-12: Documented the seeded dev command in English and Russian READMEs; release packaging remains unaffected because scripts/examples are excluded from the release payload.
