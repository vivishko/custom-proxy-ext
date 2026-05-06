# CI-02. Main-only release tag helper

## Context / why

The current release workflow publishes a GitHub Release package whenever a `v*` tag is pushed. That is convenient, but it does not currently prove the tagged commit is part of `origin/main`.

Release tagging is also manual: the user has to remember the correct sequence (`checkout main`, `pull`, create annotated tag, push tag). A small npm script can make the intended release path repeatable, while the workflow still enforces the server-side safety check.

## Goals

- Add an npm release-tag helper that creates and pushes an annotated `vX.Y.Z` tag from the latest `origin/main`.
- Add a release workflow guard that refuses to publish packages for tags whose commit is not contained in `origin/main`.
- Keep release package publication tied to GitHub Actions, not local machines.
- Make accidental feature-branch tags fail before package verification/build/release creation.

## Non-goals

- Publishing browser store releases.
- Creating GitHub Releases locally.
- Auto-generating release notes.
- Bumping `manifest.json` version in this helper unless explicitly added in a later task.

## User scenarios

- Maintainer runs `npm run release:tag -- v1.3.0`; the helper updates local `main`, creates annotated tag `v1.3.0` on `origin/main`, and pushes the tag.
- Maintainer accidentally tags a feature-branch commit and pushes `v1.3.0`; GitHub Actions starts but fails before publishing a package because the commit is not in `origin/main`.
- Maintainer tries to tag when local changes are present; the helper stops and asks for a clean working tree.

## Requirements

- Must: Provide an npm script, preferred command: `npm run release:tag -- vX.Y.Z`.
- Must: Validate tag format as `v<major>.<minor>.<patch>`.
- Must: Fetch `origin main` before tagging.
- Must: Ensure the working tree is clean before switching/pulling/tagging.
- Must: Ensure the tag does not already exist locally or on `origin`.
- Must: Create an annotated tag with message equal to the tag name.
- Must: Push only the tag, not arbitrary branch commits.
- Must: Add release workflow guard that verifies `$GITHUB_SHA` is an ancestor of `origin/main`.
- Should: Use a Node.js script under `scripts/` for portable validation and clearer errors.
- Should: Document the release command in README or release docs.

## Risks / questions

- `git checkout main` can disturb a user's current branch; the helper should explain that it switches to `main` or use a temporary worktree strategy if needed.
- Shallow checkout in GitHub Actions can make ancestry checks unreliable; the workflow guard should fetch enough history for `git merge-base --is-ancestor`.
- The helper should not hide failed prerequisites such as missing `releases/vX.Y.Z.md` or manifest version mismatch; those remain enforced by release workflow/package verification.

## Plan (steps)

1. Add `scripts/release-tag.mjs` with argument parsing, clean-tree check, tag-format validation, remote tag existence check, `origin/main` sync, annotated tag creation, and tag push.
2. Add `release:tag` to `package.json`.
3. Add a `release.yml` guard before package verification/build that checks the tagged commit is contained in `origin/main`.
4. Document the command and release flow.
5. Test failure paths locally without pushing real tags where possible.

## Instruction for AI

Implement an npm-based release tag helper and a GitHub Actions main-ancestry guard so release packages are published only from tags pointing at commits in `origin/main`.

## Changelog / Decisions

- 2026-05-06: Spec created from discussion. Decision: use npm script as the user-facing helper, with GitHub Actions remaining the source of truth for package publication.

