# AGENTS.md

Guidance for agentic work in this repository.
Keep this file updated as workflows or conventions change.

---

# Project overview

- Browser extension (Manifest V3) with background worker and popup UI.
- Plain JavaScript ES modules (no TypeScript, no build step).
- Core files: background.js, popup.js, utils.js, manifest.json.

---

# Build / lint / test commands

This repo is intentionally minimal and does not have a build step.

- npm install
- npm run lint
- npm test (currently no test runner)

Manual testing (extension)

- Load unpacked in chrome://extensions/.
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
- Prefer named exports (see utils.js).

State & storage

- chrome.storage.sync is the source of truth for settings.
- Use STORAGE_KEYS in utils.js for storage key names.

Logging

- Use createLogger from utils.js; avoid direct console.\* unless consistent.
- Respect the loggingEnabled flag and storage toggle.

---

# Docs workflow: Ideas -> Roadmap -> Spec -> Implementation

This section is a HARD REQUIREMENT for all agentic work.

Canonical docs structure (single source of truth)

- Docs root: docs/
  - docs/ideas/ : raw brainstorm snapshots (1 file per time unit)
  - docs/roadmap/ : roadmap.md table + one detail file per task
  - docs/spec/ : one spec per roadmap task

If the repo currently differs, align paths in this file FIRST.
Agents must follow the paths defined here.

Roadmap table (single source of truth)

- File: docs/roadmap/roadmap.md
- Each row links to:
  - a detail file in docs/roadmap/
  - optionally a spec file in docs/spec/ (preferred when implementation-ready)

Statuses (allowed values)

- idea
- planned
- in_progress
- blocked
- done

Status sort order (flow order)

1. idea
2. planned
3. in_progress
4. blocked
5. done

Sorting rules

- Keep the table header unchanged.
- After ANY status change, re-sort rows by the order above.
- For rows with the same status, keep existing numeric ID order.

Definitions (must follow)

- "Task started" means: the agent begins analysis, spec writing, implementation,
  or any non-trivial action related to the task.
  => Immediately set the task status to in_progress and re-sort the table.

- "Task done" means:
  1. Implementation completed
  2. Manual verification performed (extension loaded & behavior checked)
  3. Spec updated to match reality (requirements, decisions, edge cases)
  4. Roadmap updated (status done + sorted)
     => Then set status to done and re-sort.
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
  - docs/spec/\* (any specs affected by the refactor)
  - any other docs that mention file structure, responsibilities, or entry points (e.g., README.md if present)
- If a refactor changes filenames, module boundaries, or responsibilities (e.g., background.js, popup.js, utils.js):
  - update all references across the repo so they remain accurate (docs and code comments included).
- If refactoring introduces new files or folders:
  - document each new file and its purpose in AGENTS.md (and any relevant specs/roadmap docs).
  - ensure the "Files to know" section stays current and remains a reliable map of the codebase.
- If a refactor removes or merges files:
  - remove or adjust documentation references accordingly (avoid stale pointers).

---

# Agent commands: what to do when user asks

When the user says "brainstorm ideas" (ideas -> roadmap):

1. Read the latest file in docs/ideas/.
2. Generate candidate tasks, each must become:
   - a new row in docs/roadmap/roadmap.md
   - a detail file in docs/roadmap/<id>-<slug>.md
3. Set initial status = idea.
4. Re-sort roadmap table by status order.

When the user says "create a spec" (roadmap -> spec):

1. Locate the task row in docs/roadmap/roadmap.md.
2. If spec file does not exist, create docs/spec/<id>-<slug>.md
   using docs/spec/spec-template.md (or repository template).
3. Update the "Spec" link in the roadmap row to point to the spec.
4. If you are actively working on it now:
   - set status to planned
   - re-sort the table.

When the user says "do this task / implement / fix bug" (spec + implementation):

1. Locate the task row in docs/roadmap/roadmap.md.
2. Set status to in_progress IMMEDIATELY and re-sort.
3. Ensure a spec exists (create from template if missing).
4. Work iteratively:
   - Update spec as you learn (requirements, decisions, risks, plan).
   - Implement changes in code.
   - Manually verify.
5. When complete:
   - Update spec to reflect final behavior.
   - Set status = done and re-sort.

When the user says "pause / not now" or work cannot proceed:

- Set status = blocked with a short reason in the detail file/spec.
- Re-sort roadmap table.

---

# Files to know

- background.js: proxy routing, PAC script creation, auth, logging.
- popup.js: UI controls, storage edits, import/export.
- utils.js: shared helpers and logging.
- docs/roadmap/roadmap.md: tracking table (single source of truth).
- docs/spec/: specs (one per task).
