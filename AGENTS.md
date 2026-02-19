# AGENTS.md

Guidance for agentic work in this repository.
Keep this file updated as workflows or conventions change.

---

# Project overview

- Browser extension (Manifest V3) with background worker and popup UI.
- Plain JavaScript ES modules (no TypeScript, no build step).
- Core files: manifest.json, extension/background/background.js, extension/popup/popup.js, extension/shared/storage.js, extension/utils.js.

---

# Build / lint / test commands

This repo is intentionally minimal and does not have a build step.

- npm install
- npm run lint
- npm test (Node.js built-in test runner via `node --test`)
- npm run check:mv3 (manifest/service-worker/popup/permissions static validation)
- npm run check:package (release payload verification)

Manual testing (extension)

- Load unpacked in chrome://extensions/ (select the project root).
- Verify background/popup behavior after changes.

---

# Code style and conventions

Language & modules

- Use JavaScript ES modules (import/export).
- Keep all files as .js, do not introduce TypeScript unless requested.

Formatting

- Indentation: 2 spaces.
- Strings: double quotes.
- Semicolons: required.

Imports

- Use relative imports with explicit file extensions: "./utils.js".
- Group imports at the top of the file.
- Prefer named exports (see extension/utils.js).

State & storage

- chrome.storage.sync is the source of truth for settings.
- Use STORAGE_KEYS in extension/utils.js for storage key names.

Logging

- Use createLogger from extension/utils.js; avoid direct console.\* unless consistent.
- Respect the loggingEnabled flag and storage toggle.

---

# Docs workflow: Ideas -> Roadmap -> Spec -> Implementation

This section is a HARD REQUIREMENT for all agentic work.

Canonical docs structure (single source of truth)

- Docs root: docs/
  - docs/ideas/ : raw brainstorm snapshots (1 file per time unit)
  - docs/roadmap/ : roadmap.md table + one detail file per task
  - docs/specs/ : one spec per roadmap task

If the repo currently differs, align paths in this file FIRST.
Agents must follow the paths defined here.

Roadmap table (single source of truth)

- File: docs/roadmap/roadmap.md
- Each row links to:
  - a detail file in docs/roadmap/
  - optionally a spec file in docs/specs/ (preferred when implementation-ready)

Roadmap detail files policy

- Keep `docs/roadmap/*.md` concise (goal/value/priority/dependencies only).
- Do not keep progress notes/changelog there; use the spec file `## Changelog / Decisions` as the single history log.

## Task IDs and file naming

### Task ID format

All tasks use an ID based on [Conventional Commits](https://www.conventionalcommits.org/) type + numeric sequence.

The type prefix is derived from the conventional-commit type that best describes the work.
Common types and their task prefixes:

- FEAT-<NN> (new feature)
- FIX-<NN> / BUG-<NN> (bug fix)
- IMPROVE-<NN> (improvement / UX / polish)
- REFACTOR-<NN> (code restructuring without behavior change)
- PERF-<NN> (performance improvement)
- STYLE-<NN> (formatting, CSS, visual-only changes)
- DOCS-<NN> (documentation only)
- TEST-<NN> (adding or updating tests)
- CI-<NN> (CI/CD pipelines and release automation)
- CHORE-<NN> (maintenance, tooling; use sparingly)

This list is not exhaustive. If a Conventional Commits type not listed above
fits better, use it as the prefix (UPPERCASE in tables, lowercase in filenames).

Rules:

- The numeric part is zero-padded to 2 digits when < 10 (e.g. BUG-01, FEAT-02).
- IDs are UPPERCASE in tables and release notes (BUG-01), but lowercase in filenames (bug-01).
- Each type has its own independent numeric sequence (FEAT-01, BUG-01, REFACTOR-01 can coexist).

### Slugs and filenames

Spec/detail filenames MUST include the lowercase type prefix:

- docs/specs/<type>-<nn>-<slug>.md
- docs/roadmap/<type>-<nn>-<slug>.md

Where:

- <type> is the lowercase conventional-commit prefix (feat, bug, improve, refactor, perf, style, docs, test, ci, chore, etc.)
- <nn> is the zero-padded number (01, 02, 11, ...)
- <slug> is kebab-case derived from the title (same as before)

Examples:

- IMPROVE-11 -> docs/specs/improve-11-ux-enable-proxy-controls.md
- BUG-01 -> docs/specs/bug-01-enable-only-on-this-page-disables-proxy.md

### Roadmap table requirements

The Roadmap table "ID" column must always store the typed ID (e.g. IMPROVE-11, BUG-01).
The "Title" column may keep the existing human numbering/prefix, but it must not be the source of truth.

The Roadmap table MUST include and maintain these date columns:

- `created_date` (YYYY-MM-DD): date when the task row is created.
- `started_date` (YYYY-MM-DD or `-`): set when status first becomes `in_progress`.
- `done_date` (YYYY-MM-DD or `-`): set when status becomes `done`.

Date rules:

- When task is created: set `created_date` to the current date (`YYYY-MM-DD`), `started_date = -`, `done_date = -`.
- When task moves to `in_progress`: set `started_date` to the actual start date (`YYYY-MM-DD`) if empty; do not change `created_date`.
- When task moves to `done`: set `done_date` to the actual completion date (`YYYY-MM-DD`); keep existing `created_date` and `started_date`.
- If status moves back from `done` to non-done, clear `done_date` to `-`.
- Use ISO format only: `YYYY-MM-DD`.

Example migration:

- ID: 11 -> IMPROVE-11
- ID: B01 -> BUG-01

### When creating a new task (ideas -> roadmap)

1. Choose the appropriate type prefix based on Conventional Commits (FEAT, BUG, IMPROVE, REFACTOR, PERF, STYLE, DOCS, TEST, CI, CHORE, etc.).
2. Pick the next available numeric sequence for that type.
3. Create the task row with the typed ID (e.g. FEAT-12, REFACTOR-01).
4. Create the detail/spec file using the lowercase filename convention:
   - feat-12-<slug>.md / bug-03-<slug>.md / refactor-01-<slug>.md
5. Ensure the Roadmap "Spec" link points to the new typed filename.
6. Set roadmap date fields on creation:
   - `created_date = current date (YYYY-MM-DD)`
   - `started_date = -`
   - `done_date = -`

### When a task already exists but uses a legacy ID

If a task row uses a legacy ID (like "11" or "B01") and the user requests the new format:

1. Convert the Roadmap "ID" cell to the typed format:
   - Pure numbers default to IMPROVE-<NN> unless the user specifies otherwise.
   - "Bxx" becomes BUG-<NN> (B01 -> BUG-01).
2. Rename the spec/detail file to include the type prefix if missing:
   - 11-ux-enable-proxy-controls.md -> improve-11-ux-enable-proxy-controls.md
3. Update all links that pointed to the old filename (roadmap row, any cross-references).
4. Do not change the human title text unless requested.

### Release notes tasks

Release notes must include a "## Tasks" section that lists typed IDs:

- FEAT-12
- BUG-01
- IMPROVE-11

## Statuses

Statuses (allowed values)

- idea
- planned
- in_progress
- blocked
- done

Status sort order (flow order)

1. in_progress
2. planned
3. idea
4. blocked
5. done

Sorting rules

- Keep the table header unchanged.
- After ANY status change, re-sort rows by the order above.
- For rows with the same status, keep existing numeric ID order.

Status emoji colors (prefix Status with emoji)

- 🟣 idea (#8B5CF6)
- 🔵 planned (#3B82F6)
- 🟠 in_progress (#F59E0B)
- 🔴 blocked (#EF4444)
- 🟢 done (#22C55E)

## Definitions (must follow)

- "Task started" means: the agent begins analysis, spec writing, implementation,
  or any non-trivial action related to the task.
  => Immediately set the task status to in_progress, set `started_date` to the actual start date (`YYYY-MM-DD`) if not set, and re-sort the table.

- "Task done" means:
  1. Implementation completed
  2. Manual verification performed (extension loaded & behavior checked)
  3. Spec updated to match reality (requirements, decisions, edge cases)
  4. Roadmap updated (status done + sorted)
     => Then set status to done, set `done_date` to the actual completion date (`YYYY-MM-DD`), and re-sort.
  5. When complete:
     - Update spec to reflect final behavior.
     - Set status = done, unlock dependent blocked tasks (rule above), and re-sort.

Unblocking dependent tasks when a task is completed

- When a task is moved to status = done:
  1. Scan docs/roadmap/roadmap.md for rows where:
     - Status = blocked
     - Dependencies contains the completed task ID
  2. Re-evaluate remaining dependencies:
     - If ALL remaining dependencies are already done (or Dependencies becomes "-" / empty),
       set Status = idea (unblocked).
     - Otherwise keep Status = blocked (still blocked by other not-done dependencies).
  3. After any changes, re-sort the roadmap table by the status flow order.

Continuous spec maintenance (do this DURING work)

- Specs are living documents.
- Whenever requirements are clarified, decisions are made, edge cases found,
  or scope changes, update the spec immediately (same session).
- Keep a short "Changelog / Decisions" section in each spec (append-only).
- Write specs in English.

---

# Refactoring and documentation sync

When the user asks for refactoring, documentation updates are part of "done".

- After completing a refactor, update documentation so it matches the codebase:
  - AGENTS.md
  - docs/roadmap/\* (task details if the refactor impacts tasks/scopes)
  - docs/specs/\* (any specs affected by the refactor)
  - any other docs that mention file structure, responsibilities, or entry points (e.g., README.md if present)
- If a refactor changes filenames, module boundaries, or responsibilities (e.g., extension/background.js, extension/popup.js, extension/utils.js):
  - update all references across the repo so they remain accurate (docs and code comments included).
- If refactoring introduces new files or folders:
  - document each new file and its purpose in AGENTS.md (and any relevant specs/roadmap docs).
  - ensure the "Files to know" section stays current and remains a reliable map of the codebase.
- If a refactor removes or merges files:
  - remove or adjust documentation references accordingly (avoid stale pointers).
- If manifest paths or extension asset locations change during any task (not just releases):
  - update `.github/workflows/release.yml` to keep release packaging correct.

---

# Agent commands: what to do when user asks

When the user says "brainstorm ideas" (ideas -> roadmap):

1. Read the latest file in docs/ideas/.
2. Generate candidate tasks, each must become:
   - a new row in docs/roadmap/roadmap.md
   - a detail file in docs/roadmap/<id>-<slug>.md
3. Set initial status = idea.
4. Set date fields: `created_date = current date (YYYY-MM-DD)`, `started_date = -`, `done_date = -`.
5. Re-sort roadmap table by status order.

When the user says "create a spec" (roadmap -> spec):

1. Locate the task row in docs/roadmap/roadmap.md.
2. If spec file does not exist, create docs/specs/<id>-<slug>.md
   using docs/specs/spec-template.md (or repository template).
3. Update the "Spec" link in the roadmap row to point to the spec.
4. If you are actively working on it now:
   - set status to planned
   - re-sort the table.

When the user says "do this task / implement / fix bug" (spec + implementation):

1. Locate the task row in docs/roadmap/roadmap.md.
2. Set status to in_progress IMMEDIATELY and re-sort.
   - Also set `started_date` to the actual start date (`YYYY-MM-DD`) if not already set.
3. Ensure a spec exists (create from template if missing).
4. Work iteratively:
   - Update spec as you learn (requirements, decisions, risks, plan).
   - Implement changes in code.
   - Manually verify.
5. When complete:
   - Update spec to reflect final behavior.
   - Set status = done, set `done_date` to the actual completion date (`YYYY-MM-DD`), and re-sort.

When the user says "prepare release notes" or "generate release notes" (post-implementation):

Goal: create a release notes file in releases/ that reflects a specific release and includes task IDs.

1. Determine the release tag/version the user requested (e.g. vX.Y.Z).
2. Collect the list of tasks to include in this release:
   - Primary source: tasks in docs/roadmap/roadmap.md with status = done.
   - Prefer tasks that were completed since the last release tag (if tags exist).
   - If the user explicitly names task IDs, use exactly that list.
3. Draft release notes file: releases/vX.Y.Z.md
   - Must be single-language (no bilingual content).
   - Must include a "Tasks" section listing task IDs included in the release.
   - Must mention major refactors (if any) in Overview/Improvements.
   - Keep it user-facing: what changed, why it matters, any breaking changes, any upgrade notes.
   - Avoid promising future work; only describe what is shipped.
4. Bump extension version in `manifest.json` to match the release version (`X.Y.Z` without `v`).
5. Do NOT create git tags or GitHub Releases in this step unless the user asked for it.

Recommended release notes structure:

## Overview

...

## New

...

## Improvements

...

## Fixes & stability

...

## Tasks

- FEAT-123
- BUG-456

When the user says "cut release" / "create tag" / "tag and push release" (publish step):

Goal: create a release commit + git tag vX.Y.Z, and push the tag.

1. Determine the release tag/version the user requested (e.g. vX.Y.Z).
2. Verify prerequisites in the repo:
   - Version has been bumped (e.g. manifest.json and any other relevant places).
   - releases/vX.Y.Z.md exists.
3. Create a dedicated release commit:
   - Include the version bump + releases/vX.Y.Z.md in the commit.
   - Commit message: "release vX.Y.Z"
4. Create an annotated tag:
   - Tag name: vX.Y.Z
   - Tag message: "vX.Y.Z"
5. Push:
   - Push the commit to the current branch.
   - Push the tag to origin.
7. Do NOT generate release notes here unless the user asked (this step assumes notes already exist).

When the user says "pause / not now" or work cannot proceed:

- Set status = blocked with a short reason in the detail file/spec.
- Re-sort roadmap table.

---

# Files to know

Extension root (extension/)
- extension/popup.html: popup shell.
- extension/popup.css: popup styles.
- extension/utils.js: shared helpers and logging.
- extension/strings.js: UI text strings.
- extension/icon48.png: extension icon.

Repo root
- manifest.json: MV3 manifest (service worker + popup).
- .github/workflows/ci.yml: pull-request/push quality gate (lint, tests, MV3 checks, security).
- .github/workflows/release.yml: tag-based packaging/release workflow with package verification.
- scripts/check-mv3.mjs: MV3 static checks for manifest and entrypoint integrity.
- scripts/verify-package.mjs: release payload verification (content allowlist, size, version/tag match).
- scripts/build-release-package.mjs: deterministic release zip creation + sha256 output.

Background (extension/background/)
- extension/background/auth-handler.js: proxy auth handler (onAuthRequired).
- extension/background/background.js: entry point, listeners, message router, logging.
- extension/background/pac-builder.js: PAC script generator (string template).
- extension/background/proxy-modes.js: proxy apply strategies + coordinator.
- extension/background/tab-tracker.js: tab domain tracking + temp cleanup.

Popup (extension/popup/)
- extension/popup/popup.js: entry point, screen routing, init wiring.
- extension/popup/proxy-controls.js: global/per-page toggles + control handlers.
- extension/popup/proxy-crud.js: proxy CRUD + import/export.
- extension/popup/site-rules.js: rules CRUD + import/export.
- extension/popup/ui-render.js: render helpers (dropdowns, status).
- extension/popup/validation.js: pure form validation helpers.

Shared (extension/shared/)
- extension/shared/storage.js: shared chrome.storage.sync access layer.

Docs
- docs/roadmap/roadmap.md: tracking table (single source of truth).
- docs/specs/: specs (one per task).
