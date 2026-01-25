# Roadmap

This folder keeps the single source of truth for feature tracking.

## Core file

- `roadmap.md` is the only tracking table.
- Each row links to a detail file in `docs/roadmap/` (and later to a spec in `docs/specs/` when ready).
- Dependencies live in the table (no separate plan file).

## Table columns

- ID (short numeric in roadmap order)
- Title
- Tag (L/M/H/N + original item number)
- Priority (P0/P1/P2)
- Complexity (S/M/L)
- Status (`idea` / `planned` / `in_progress` / `done` / `blocked`)
- Spec (link to roadmap detail or `docs/specs/feature.md`)
- Goal/Value
- Dependencies (IDs)

## Detail files

Naming options (pick one and stick to it):
- YYYY-MM-task_id.md
- task_id-short-description.md

Each detail file should include:
- Goal
- Value
- Priority (P0/P1/P2)
- Complexity (S/M/L)
- Dependencies (if any)
- Notes / open questions

## Spec files

When a feature is ready for implementation, create a spec file in `docs/specs/` using `docs/specs/spec-template.md` and update the table link.
