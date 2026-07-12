import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  findBrowserExecutable,
  loadSeedData,
  prepareSeededExtension,
} from "../../scripts/seeded-extension-dev.mjs";

test("loadSeedData returns deterministic extension storage values", () => {
  const seedData = loadSeedData();

  assert.equal(seedData.proxies.length, 3);
  assert.equal(Object.keys(seedData.siteRules).length, 4);
  assert.equal(seedData.globalProxyEnabled, false);
  assert.equal(seedData.lastSelectedProxy, "dev-http-us");
  assert.equal(seedData.temporaryProxySites["shop.example.test"], "dev-socks-de");
  assert.equal(seedData.loggingEnabled, true);
});

test("prepareSeededExtension creates patched temporary extension copy", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-ext-dev-test-"));

  try {
    const prepared = prepareSeededExtension({ workDir });
    const manifest = JSON.parse(
      fs.readFileSync(path.join(prepared.extensionRoot, "manifest.json"), "utf8")
    );
    const background = fs.readFileSync(
      path.join(prepared.extensionRoot, "extension", "background", "background.js"),
      "utf8"
    );
    const seedModule = fs.readFileSync(
      path.join(prepared.extensionRoot, "extension", "dev-seed.js"),
      "utf8"
    );

    assert.equal(manifest.name, "My Extension (Seeded Dev)");
    assert.match(background, /import "\.\.\/dev-seed\.js";/);
    assert.match(seedModule, /chrome\.storage\.sync\.set/);
    assert.match(seedModule, /dev-http-us/);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test("findBrowserExecutable respects explicit environment path", () => {
  const browserPath = findBrowserExecutable({
    env: { CHROME_PATH: "/custom/chrome" },
    existsSync: () => false,
  });

  assert.equal(browserPath, "/custom/chrome");
});

test("seeded extension dev script is safe to import dynamically", async () => {
  const module = await import("../../scripts/seeded-extension-dev.mjs");

  assert.equal(typeof module.run, "function");
});
