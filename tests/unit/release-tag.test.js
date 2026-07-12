import test from "node:test";
import assert from "node:assert/strict";

import {
  assertCleanWorkingTree,
  assertTagDoesNotExist,
  runReleaseTag,
  validateReleaseTag,
} from "../../scripts/release-tag.mjs";

function createMockGit(responses = {}) {
  const calls = [];
  const runGit = (args) => {
    calls.push(args);
    const key = args.join(" ");
    const response = responses[key];
    if (response instanceof Error) {
      throw response;
    }
    return response || "";
  };
  runGit.calls = calls;
  return runGit;
}

test("validateReleaseTag accepts semantic v-tags", () => {
  assert.doesNotThrow(() => validateReleaseTag("v1.2.3"));
});

test("validateReleaseTag rejects malformed tags", () => {
  assert.throws(
    () => validateReleaseTag("1.2.3"),
    /v<major>\.<minor>\.<patch>/
  );
  assert.throws(
    () => validateReleaseTag("v1.2"),
    /v<major>\.<minor>\.<patch>/
  );
});

test("assertCleanWorkingTree rejects dirty status output", () => {
  const runGit = createMockGit({
    "status --porcelain": " M manifest.json",
  });

  assert.throws(() => assertCleanWorkingTree(runGit), /Working tree must be clean/);
});

test("assertTagDoesNotExist rejects local or remote tags", () => {
  assert.throws(
    () =>
      assertTagDoesNotExist(
        createMockGit({ "tag --list v1.2.3": "v1.2.3" }),
        "v1.2.3"
      ),
    /already exists locally/
  );

  assert.throws(
    () =>
      assertTagDoesNotExist(
        createMockGit({
          "ls-remote --tags origin v1.2.3": "abc123\trefs/tags/v1.2.3",
        }),
        "v1.2.3"
      ),
    /already exists on origin/
  );
});

test("runReleaseTag fetches main, tags origin/main, and pushes only the tag", () => {
  const runGit = createMockGit({
    "rev-parse origin/main": "abc123",
    "rev-parse HEAD": "abc123",
  });

  const result = runReleaseTag({ tag: "v1.2.3", runGit });

  assert.deepEqual(result, { tag: "v1.2.3", sha: "abc123" });
  assert.deepEqual(runGit.calls, [
    ["status", "--porcelain"],
    ["fetch", "origin", "main:refs/remotes/origin/main", "--tags"],
    ["tag", "--list", "v1.2.3"],
    ["ls-remote", "--tags", "origin", "v1.2.3"],
    ["switch", "main"],
    ["pull", "--ff-only", "origin", "main"],
    ["rev-parse", "origin/main"],
    ["rev-parse", "HEAD"],
    ["tag", "-a", "v1.2.3", "-m", "v1.2.3", "abc123"],
    ["push", "origin", "v1.2.3"],
  ]);
});

test("runReleaseTag rejects when local main does not match origin/main", () => {
  const runGit = createMockGit({
    "rev-parse origin/main": "abc123",
    "rev-parse HEAD": "def456",
  });

  assert.throws(
    () => runReleaseTag({ tag: "v1.2.3", runGit }),
    /does not match origin\/main/
  );
});
