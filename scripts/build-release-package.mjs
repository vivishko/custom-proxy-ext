import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

import { collectReleaseFiles, verifyPackage } from "./verify-package.mjs";

function parseArgs(argv) {
  let tag = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tag") {
      tag = argv[++i] || null;
    }
  }
  if (!tag) {
    throw new Error("Missing required argument: --tag vX.Y.Z");
  }
  return { tag };
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function buildZip(repoRoot, tag) {
  const zipName = `custom-proxy-ext-${tag}.zip`;
  const zipPath = path.join(repoRoot, zipName);
  const files = collectReleaseFiles(repoRoot);

  const zipResult = spawnSync("zip", ["-X", "-q", zipName, ...files], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (zipResult.status !== 0) {
    throw new Error(
      `zip command failed: ${zipResult.stderr || zipResult.stdout || "unknown"}`
    );
  }

  const checksum = sha256File(zipPath);
  fs.writeFileSync(
    path.join(repoRoot, `${zipName}.sha256`),
    `${checksum}  ${zipName}\n`,
    "utf8"
  );

  console.log(`Built ${zipName}`);
  console.log(`SHA256: ${checksum}`);
}

try {
  const { tag } = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  verifyPackage({ repoRoot, tag });
  buildZip(repoRoot, tag);
} catch (error) {
  console.error("Release packaging failed.");
  console.error(error.message);
  process.exit(1);
}
