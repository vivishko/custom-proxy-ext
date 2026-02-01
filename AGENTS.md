# AGENTS.md
# Guidance for agentic coding in this repository.
# Keep this file updated as workflows or conventions change.

# Project overview
# - Browser extension (Manifest V3) with background worker and popup UI.
# - Plain JavaScript ES modules (no TypeScript, no build step).
# - Core files: background.js, popup.js, utils.js, manifest.json.

# ----------------------------------------------------------------------------
# Build / lint / test commands
# ----------------------------------------------------------------------------
# This repo is intentionally minimal and does not have a build step.

# Install dependencies
#   npm install

# Lint (repo-wide)
#   npm run lint
#   - Uses ESLint with eslint:recommended and minimal custom rules.
#   - No autofix script is defined.

# Tests
#   npm test
#   - Currently prints "Error: no test specified" and exits 1.
#   - There is no configured test runner.

# Running a single test
#   Not applicable yet (no test framework).
#   If you add one, update this section with exact per-file/per-test commands.

# Manual testing (extension)
# - Load unpacked in chrome://extensions/.
# - Verify background/popup behavior after changes.

# ----------------------------------------------------------------------------
# Code style and conventions
# ----------------------------------------------------------------------------
# Language & modules
# - Use JavaScript ES modules (import/export) with "type": "commonjs" in
#   package.json, but files already use ESM syntax in the extension context.
# - Keep all files as .js, do not introduce TypeScript unless requested.

# Formatting
# - Indentation: 2 spaces.
# - Strings: double quotes.
# - Semicolons: required.
# - Trailing commas where the existing style uses them (mostly objects/arrays).
# - Keep line length reasonable; match surrounding formatting.

# Imports
# - Use relative imports with explicit file extensions: "./utils.js".
# - Group imports at the top of the file.
# - Prefer named exports (see utils.js).

# Naming
# - camelCase for variables/functions.
# - PascalCase for classes (rare).
# - UPPER_SNAKE_CASE for constants (e.g., STORAGE_KEYS).
# - Use descriptive names for DOM elements (proxyToggle, siteRulesTableBody).

# State & storage
# - chrome.storage.sync is the source of truth for settings.
# - Use STORAGE_KEYS in utils.js for storage key names.
# - Prefer retrieving with Object.values(STORAGE_KEYS) when multiple keys needed.

# Error handling
# - Guard early for missing data (null/undefined checks).
# - Use try/catch around JSON parsing and URL parsing.
# - Log errors via createLogger (logError/logWarn) where appropriate.
# - Avoid throwing in UI event handlers; show user-facing alerts instead.

# Logging
# - Use createLogger from utils.js; do not call console.* directly unless
#   consistent with existing usage.
# - Respect the loggingEnabled flag and storage toggle.

# DOM / UI
# - Use DOM APIs directly (no framework).
# - Keep screen navigation via .screen and [data-screen-target] conventions.
# - Keep button handlers small; delegate to helper functions when needed.

# Data structures
# - Proxies are objects with name/host/port/username/password/country/protocol.
# - Site rules are keyed by domain, values of { type, proxyName? }.
# - Temporary toggles live in temporaryDirectSites / temporaryProxySites.

# ----------------------------------------------------------------------------
# Lint rules (from .eslintrc.js)
# ----------------------------------------------------------------------------
# - env: browser, es2021, webextensions
# - extends: eslint:recommended
# - no-undef: error
# - no-unused-vars: warn, ignore args starting with _
# - no-console: off (console is allowed)

# ----------------------------------------------------------------------------
# Specs and roadmap process (docs/roadmap)
# ----------------------------------------------------------------------------
# Roadmap is the single source of truth:
# - Table lives in docs/roadmap/roadmap.md.
# - Each row links to a detail file in docs/roadmap/.
# - Specs live in docs/specs/ and use docs/specs/spec-template.md.

# Required workflow when writing a spec + implementing it
# - If asked to write a spec and implement it, always update the roadmap table:
#   1) Update the Status for the relevant row.
#   2) Sort the table rows by the required status order (see below).
# - This is a hard requirement for agentic work in this repo.

# Status order for roadmap sorting
# - in_progress
# - planned
# - idea
# - blocked
# - done
# Notes:
# - Keep the table header unchanged.
# - Preserve IDs and links.
# - When multiple rows share a status, keep existing numeric ID order.

# ----------------------------------------------------------------------------
# Files to know
# ----------------------------------------------------------------------------
# - background.js: proxy routing, PAC script creation, auth, logging.
# - popup.js: UI controls, storage edits, import/export.
# - utils.js: shared helpers and logging.
# - docs/roadmap/roadmap.md: feature tracking table.

# ----------------------------------------------------------------------------
# Cursor / Copilot rules
# ----------------------------------------------------------------------------
# - No .cursor/rules/, .cursorrules, or .github/copilot-instructions.md found.
# - If added later, copy the rules here verbatim and follow them.
