import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TAG_PATTERN = /^v\d+\.\d+\.\d+$/;

function parseArgs(argv) {
  const [tag, ...rest] = argv;
  if (!tag || rest.length > 0) {
    throw new Error("Usage: npm run release:tag -- vX.Y.Z");
  }
  return { tag };
}

export function validateReleaseTag(tag) {
  if (!TAG_PATTERN.test(String(tag || ""))) {
    throw new Error("Release tag must use format v<major>.<minor>.<patch>.");
  }
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd || process.cwd(),
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(`git ${args.join(" ")} failed${output ? `:\n${output}` : ""}`);
  }

  return String(result.stdout || "").trim();
}

export function createGitRunner({ cwd = process.cwd() } = {}) {
  return (args, options = {}) => git(args, { cwd, ...options });
}

export function assertCleanWorkingTree(runGit) {
  const status = runGit(["status", "--porcelain"]);
  if (status) {
    throw new Error("Working tree must be clean before creating a release tag.");
  }
}

export function assertTagDoesNotExist(runGit, tag) {
  const localTag = runGit(["tag", "--list", tag]);
  if (localTag) {
    throw new Error(`Tag already exists locally: ${tag}`);
  }

  const remoteTag = runGit(["ls-remote", "--tags", "origin", tag]);
  if (remoteTag) {
    throw new Error(`Tag already exists on origin: ${tag}`);
  }
}

export function runReleaseTag({ tag, runGit = createGitRunner() }) {
  validateReleaseTag(tag);
  assertCleanWorkingTree(runGit);

  runGit(["fetch", "origin", "main:refs/remotes/origin/main", "--tags"]);
  assertTagDoesNotExist(runGit, tag);

  runGit(["switch", "main"]);
  runGit(["pull", "--ff-only", "origin", "main"]);
  const mainSha = runGit(["rev-parse", "origin/main"]);
  const headSha = runGit(["rev-parse", "HEAD"]);
  if (headSha !== mainSha) {
    throw new Error(
      `Local main (${headSha}) does not match origin/main (${mainSha}).`
    );
  }

  runGit(["tag", "-a", tag, "-m", tag, mainSha]);
  runGit(["push", "origin", tag], { stdio: "inherit" });

  return { tag, sha: mainSha };
}

export function runCli(argv = process.argv.slice(2)) {
  const { tag } = parseArgs(argv);
  const result = runReleaseTag({ tag });
  console.log(`Pushed release tag ${result.tag} at ${result.sha}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
