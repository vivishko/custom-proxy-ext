# Roadmap

This folder keeps the single source of truth for feature tracking.

## Core file

- `roadmap.md` is the only tracking table.
- Each row links to a detail file in `docs/roadmap/` (and later to a spec in `docs/specs/` when ready).
- Dependencies live in the table (no separate plan file).

## Table columns

- ID (typed task ID, e.g. `IMPROVE-11`, `BUG-01`)
- Title
- Tag (L/M/H/N + original item number)
- Priority (P0/P1/P2)
- Complexity (S/M/L)
- Status (`idea` / `planned` / `in_progress` / `done` / `blocked`)
- created_date (YYYY-MM-DD)
- started_date (YYYY-MM-DD or `-`)
- done_date (YYYY-MM-DD or `-`)
- Spec (link to roadmap detail or `docs/specs/<type>-<nn>-<slug>.md`)
- Goal/Value
- Dependencies (IDs)

## Detail files

Use typed filename format:
- `docs/roadmap/improve-11-ux-enable-proxy-controls.md`
- `docs/roadmap/bug-01-enable-only-on-this-page-disables-proxy.md`

Each detail file should include:
- Goal
- Value
- Priority (P0/P1/P2)
- Complexity (S/M/L)
- Dependencies (if any)
- Notes / open questions

## Spec files

When a feature is ready for implementation, create a spec file in `docs/specs/` using `docs/specs/spec-template.md` and update the table link.
Use typed filename format: `docs/specs/<type>-<nn>-<slug>.md`.
