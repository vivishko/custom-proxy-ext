import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ALLOWED_FILE_PREFIXES = [
  "manifest.json",
  "extension/",
  "README.md",
  "README_ru.md",
  "LICENCE",
  "LICENSE",
];

const FORBIDDEN_IN_RELEASE = [
  /^node_modules\//,
  /^tests\//,
  /^docs\//,
  /^\.github\//,
  /^scripts\//,
  /^eslint\.config\.cjs$/,
  /^package(-lock)?\.json$/,
  /^\.env($|\.)/,
];

const MAX_UNZIPPED_BYTES = 25 * 1024 * 1024;

function parseArgs(argv) {
  const args = { tag: null, writeList: null };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--tag") {
      args.tag = argv[++i] || null;
    } else if (token === "--write-list") {
      args.writeList = argv[++i] || null;
    }
  }
  return args;
}

function getTrackedFiles(repoRoot) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output
    .split("\u0000")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAllowed(filePath) {
  return ALLOWED_FILE_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return filePath.startsWith(prefix);
    return filePath === prefix;
  });
}

function verifyForbiddenPatterns(files) {
  const forbidden = files.filter((file) =>
    FORBIDDEN_IN_RELEASE.some((pattern) => pattern.test(file))
  );
  if (forbidden.length > 0) {
    throw new Error(
      `Forbidden files present in release payload: ${forbidden.join(", ")}`
    );
  }
}

function verifyManifestVersion(repoRoot, tag) {
  if (!tag) return;
  const versionFromTag = String(tag).replace(/^v/, "");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "manifest.json"), "utf8")
  );
  if (manifest.version !== versionFromTag) {
    throw new Error(
      `manifest.json version (${manifest.version}) does not match tag (${versionFromTag}).`
    );
  }
}

function verifyFileSizes(repoRoot, files) {
  const total = files.reduce((sum, relPath) => {
    const fullPath = path.join(repoRoot, relPath);
    const stat = fs.statSync(fullPath);
    return sum + stat.size;
  }, 0);

  if (total > MAX_UNZIPPED_BYTES) {
    throw new Error(
      `Release payload too large: ${total} bytes (limit ${MAX_UNZIPPED_BYTES}).`
    );
  }
}

export function collectReleaseFiles(repoRoot) {
  const tracked = getTrackedFiles(repoRoot);
  const selected = tracked.filter(isAllowed).sort();
  if (!selected.includes("manifest.json")) {
    throw new Error("manifest.json is missing from release payload.");
  }
  if (!selected.some((item) => item.startsWith("extension/"))) {
    throw new Error("No extension files selected for release payload.");
  }
  return selected;
}

export function verifyPackage({ repoRoot, tag, writeList } = {}) {
  const root = repoRoot || process.cwd();
  const releaseFiles = collectReleaseFiles(root);
  verifyForbiddenPatterns(releaseFiles);
  verifyManifestVersion(root, tag);
  verifyFileSizes(root, releaseFiles);

  if (writeList) {
    fs.writeFileSync(writeList, `${releaseFiles.join("\n")}\n`, "utf8");
  }

  console.log(`Package verification passed. Files: ${releaseFiles.length}`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  verifyPackage({
    repoRoot: process.cwd(),
    tag: args.tag,
    writeList: args.writeList,
  });
} catch (error) {
  console.error("Package verification failed.");
  console.error(error.message);
  process.exit(1);
}
