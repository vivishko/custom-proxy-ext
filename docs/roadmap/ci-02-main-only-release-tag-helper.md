# CI-02. Main-only release tag helper

- Goal: Add a safe release helper that tags the current `origin/main` commit and pushes the tag, plus a release workflow guard that refuses to publish packages for tags outside `main`.
- Value: Make releases repeatable while preventing accidental package publication from feature-branch tags.
- Priority: P1
- Complexity: M
- Dependencies: CI-01
- Tag: Q5

