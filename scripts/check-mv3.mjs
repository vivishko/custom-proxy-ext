import fs from "node:fs";
import path from "node:path";

function fail(message) {
  throw new Error(message);
}

function ensureFileExists(repoRoot, relPath, label) {
  if (!relPath || typeof relPath !== "string") {
    fail(`${label} is missing or invalid.`);
  }
  const full = path.join(repoRoot, relPath);
  if (!fs.existsSync(full)) {
    fail(`${label} does not exist: ${relPath}`);
  }
}

function main() {
  const repoRoot = process.cwd();
  const manifestPath = path.join(repoRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fail("manifest.json not found in repository root.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  if (manifest.manifest_version !== 3) {
    fail(`manifest_version must be 3, got: ${manifest.manifest_version}`);
  }

  if (!manifest.background || typeof manifest.background !== "object") {
    fail("background section is required for this extension.");
  }
  if (manifest.background.type !== "module") {
    fail('background.type must be "module" for MV3 service worker setup.');
  }
  ensureFileExists(
    repoRoot,
    manifest.background.service_worker,
    "background.service_worker"
  );

  if (!manifest.action || typeof manifest.action !== "object") {
    fail("action section is required.");
  }
  ensureFileExists(repoRoot, manifest.action.default_popup, "action.default_popup");

  if (!manifest.icons || typeof manifest.icons !== "object") {
    fail("icons section is required.");
  }
  for (const [size, iconPath] of Object.entries(manifest.icons)) {
    ensureFileExists(repoRoot, iconPath, `icons["${size}"]`);
  }

  const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  for (const requiredPermission of ["proxy", "storage"]) {
    if (!permissions.includes(requiredPermission)) {
      fail(`Required permission missing: ${requiredPermission}`);
    }
  }

  const forbiddenPermissions = new Set(["webRequestBlocking"]);
  for (const permission of permissions) {
    if (forbiddenPermissions.has(permission)) {
      fail(`Forbidden permission for MV3 policy: ${permission}`);
    }
  }

  const hostPermissions = manifest.host_permissions;
  if (
    hostPermissions !== undefined &&
    (!Array.isArray(hostPermissions) ||
      hostPermissions.some((item) => typeof item !== "string"))
  ) {
    fail("host_permissions must be an array of strings when provided.");
  }

  console.log("MV3 static checks passed.");
}

try {
  main();
} catch (error) {
  console.error("MV3 static checks failed.");
  console.error(error.message);
  process.exit(1);
}
