import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  findBrowserExecutable,
  loadSeedData,
} from "./seeded-extension-dev.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEV_FIXTURES_DIR = path.join(REPO_ROOT, "examples", "dev");
const EXTENSION_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "manifest.json"), "utf8")
);
const DEFAULT_TIMEOUT_MS = 10000;
const CDP_COMMAND_TIMEOUT_MS = 5000;

function parseArgs(argv) {
  const args = {
    browser: null,
    keepProfile: false,
    headed: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--browser") {
      args.browser = argv[++i] || null;
    } else if (token === "--keep-profile") {
      args.keepProfile = true;
    } else if (token === "--headless") {
      args.headed = false;
    } else if (token === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function printHelp() {
  console.log([
    "Usage: npm run e2e:extension -- [options]",
    "",
    "Options:",
    "  --browser <path>   Browser executable path. Also supports CHROME_PATH.",
    "  --keep-profile     Keep the generated browser profile for debugging.",
    "  --headless         Try Chrome headless mode. Headed mode is the default.",
    "  --help             Show this message.",
  ].join("\n"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition, label, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await condition();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }

  throw new Error(
    `Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status}`);
  }
  return response.json();
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timed out connecting to CDP socket: ${this.webSocketUrl}`));
      }, CDP_COMMAND_TIMEOUT_MS);
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
      this.socket.addEventListener("open", () => clearTimeout(timeoutId), {
        once: true,
      });
      this.socket.addEventListener("error", () => clearTimeout(timeoutId), {
        once: true,
      });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result || {});
        }
        return;
      }

      if (message.method && this.listeners.has(message.method)) {
        for (const listener of this.listeners.get(message.method)) {
          listener(message.params || {});
        }
      }
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
    return () => {
      const nextListeners = (this.listeners.get(method) || []).filter(
        (item) => item !== listener
      );
      this.listeners.set(method, nextListeners);
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out running CDP command: ${method}`));
      }, CDP_COMMAND_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject });
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
      this.socket.send(payload);
    });
  }

  close() {
    this.socket?.close();
  }
}

function launchChrome({ browserPath, extensionRoot, profileDir, headed }) {
  const args = [
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionRoot}`,
    `--load-extension=${extensionRoot}`,
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--enable-unsafe-extension-debugging",
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "https://example.com",
  ];

  if (!headed) {
    args.push("--headless=new");
  }

  return spawn(browserPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function stopBrowser(browser) {
  if (!browser || browser.exitCode !== null) {
    return;
  }

  let exited = false;
  const exitedPromise = new Promise((resolve) => {
    browser.once("exit", () => {
      exited = true;
      resolve();
    });
  });
  browser.kill();
  await Promise.race([exitedPromise, sleep(2000)]);
  if (!exited && browser.exitCode === null) {
    browser.kill("SIGKILL");
    await Promise.race([exitedPromise, sleep(1000)]);
  }
  browser.stdout?.destroy();
  browser.stderr?.destroy();
  browser.unref();
}

function removeWorkDir(workDir) {
  try {
    fs.rmSync(workDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (error) {
    console.warn(`Could not remove e2e work directory at ${workDir}: ${error.message}`);
  }
}

async function readDevToolsPort(profileDir) {
  const portFile = path.join(profileDir, "DevToolsActivePort");
  const content = await waitFor(() => {
    if (!fs.existsSync(portFile)) {
      return null;
    }
    return fs.readFileSync(portFile, "utf8");
  }, "DevToolsActivePort file");

  return Number(content.split("\n")[0]);
}

function normalizePathForCompare(filePath) {
  return path.resolve(filePath).replaceAll(path.sep, "/");
}

async function getExtensionIdFromPreferences(profileDir, extensionRoot) {
  const preferencesPath = path.join(profileDir, "Default", "Preferences");
  const expectedPath = normalizePathForCompare(extensionRoot);

  return waitFor(() => {
    if (!fs.existsSync(preferencesPath)) {
      return null;
    }

    const preferences = JSON.parse(fs.readFileSync(preferencesPath, "utf8"));
    const settings = preferences.extensions?.settings || {};
    for (const [extensionId, extensionSettings] of Object.entries(settings)) {
      const settingPath = extensionSettings.path;
      if (!settingPath) {
        continue;
      }
      if (normalizePathForCompare(settingPath) === expectedPath) {
        return extensionId;
      }
    }
    return null;
  }, "extension id in Chrome preferences");
}

function getExtensionIdFromUrl(url) {
  const match = String(url || "").match(/^chrome-extension:\/\/([^/]+)\//);
  return match ? match[1] : null;
}

async function getExtensionIdFromTargets(debugPort) {
  const targets = await waitFor(async () => {
    const items = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const extensionTargets = items.filter(
      (target) =>
        target.url?.startsWith("chrome-extension://") &&
        target.webSocketDebuggerUrl
    );
    return extensionTargets.length > 0 ? extensionTargets : null;
  }, "extension targets");

  const inspectedTargets = [];
  for (const target of targets) {
    const extensionId = getExtensionIdFromUrl(target.url);
    if (!extensionId) {
      continue;
    }

    const session = new CdpSession(target.webSocketDebuggerUrl);
    try {
      await session.connect();
      await session.send("Runtime.enable");
      const manifest = await evaluate(
        session,
        "globalThis.chrome?.runtime?.getManifest?.() || null"
      );
      inspectedTargets.push({
        id: extensionId,
        url: target.url,
        name: manifest?.name || "",
      });

      if (
        manifest?.name === EXTENSION_MANIFEST.name &&
        manifest?.background?.service_worker ===
          EXTENSION_MANIFEST.background.service_worker
      ) {
        return extensionId;
      }
    } catch (error) {
      inspectedTargets.push({
        id: extensionId,
        url: target.url,
        error: error.message,
      });
    } finally {
      session.close();
    }
  }

  throw new Error(
    `Could not identify target extension. Inspected targets: ${JSON.stringify(inspectedTargets)}`
  );
}

async function getExtensionId(debugPort, profileDir, extensionRoot) {
  const extensionId = await getExtensionIdFromPreferences(
    profileDir,
    extensionRoot
  ).catch(() => null);
  if (extensionId) {
    return extensionId;
  }

  const targetExtensionId = await getExtensionIdFromTargets(debugPort)
    .catch((error) => {
      console.warn(error.message);
      return null;
    });
  if (targetExtensionId) {
    return targetExtensionId;
  }

  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`)
    .catch(() => []);
  const targetUrls = targets
    .map((target) => target.url)
    .filter(Boolean)
    .join(", ");
  throw new Error(
    `Could not find loaded extension for ${extensionRoot}. Chrome targets: ${targetUrls || "none"}`
  );
}

async function openPopupSession(debugPort, extensionId) {
  const popupUrl = `chrome-extension://${extensionId}/extension/popup.html`;
  const target = await fetchJson(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(popupUrl)}`,
    { method: "PUT" }
  );
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.connect();
  await session.send("Runtime.enable");
  await session.send("Page.enable");
  await session.send("Page.navigate", { url: popupUrl });
  let lastLoadState = null;
  try {
    await waitFor(async () => {
      const result = await evaluate(
        session,
        "({ readyState: document.readyState, href: location.href, hasChrome: Boolean(globalThis.chrome), hasStorage: Boolean(globalThis.chrome?.storage?.sync) })"
      );
      lastLoadState = result;
      return (
        result.readyState === "complete" &&
        result.href === popupUrl &&
        result.hasStorage
      );
    }, "popup load");
  } catch (error) {
    throw new Error(
      `${error.message}; last state: ${JSON.stringify(lastLoadState)}; expected URL: ${popupUrl}`
    );
  }
  return session;
}

async function evaluate(session, expression, options = {}) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    ...options,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  }

  return result.result?.value;
}

async function click(session, selector) {
  await evaluate(session, `document.querySelector(${JSON.stringify(selector)}).click()`);
}

async function waitForText(session, selector, expectedText) {
  return waitFor(async () => {
    const text = await evaluate(
      session,
      `document.querySelector(${JSON.stringify(selector)})?.textContent || ""`
    );
    return text.includes(expectedText);
  }, `${selector} to contain ${expectedText}`);
}

async function getStorage(session) {
  return evaluate(
    session,
    `new Promise((resolve) => chrome.storage.sync.get(["proxies", "siteRules", "globalProxyEnabled", "lastSelectedProxy", "temporaryDirectSites", "temporaryProxySites", "loggingEnabled"], resolve))`
  );
}

async function setStorage(session, values) {
  await evaluate(
    session,
    `new Promise((resolve) => chrome.storage.sync.set(${JSON.stringify(values)}, resolve))`
  );
}

async function uploadFile(session, selector, filePath) {
  const documentResult = await session.send("DOM.getDocument", { depth: -1 });
  const queryResult = await session.send("DOM.querySelector", {
    nodeId: documentResult.root.nodeId,
    selector,
  });
  if (!queryResult.nodeId) {
    throw new Error(`File input not found: ${selector}`);
  }
  await session.send("DOM.setFileInputFiles", {
    nodeId: queryResult.nodeId,
    files: [filePath],
  });
  await evaluate(
    session,
    `document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event("change", { bubbles: true }))`
  );
}

async function runImportWithDialogs(session, filePath, decisions) {
  const pendingDecisions = [...decisions];
  const messages = [];
  let unsubscribe = () => {};
  const dialogPromise = new Promise((resolve, reject) => {
    unsubscribe = session.on("Page.javascriptDialogOpening", async (params) => {
      const accept = pendingDecisions.shift();
      if (typeof accept !== "boolean") {
        reject(new Error(`Unexpected dialog: ${params.message}`));
        return;
      }

      messages.push(params.message);
      await session.send("Page.handleJavaScriptDialog", { accept });
      if (messages.length === decisions.length) {
        resolve(messages);
      }
    });
  });

  try {
    await uploadFile(session, "#importProxiesFile", filePath);
    return await waitFor(() => dialogPromise, "javascript dialogs");
  } finally {
    unsubscribe();
  }
}

async function resetSeededStorage(session) {
  const seedData = loadSeedData(REPO_ROOT);
  await setStorage(session, seedData);
  await click(session, "[data-screen-target='proxiesScreen']");
  await waitForText(session, "#proxiesTable", "dev-http-us");
}

async function runReplaceScenario(session) {
  await resetSeededStorage(session);
  const messages = await runImportWithDialogs(
    session,
    path.join(DEV_FIXTURES_DIR, "import-proxies-duplicate-replace-skip.json"),
    [true, true]
  );
  const alertMessage = messages[1];

  assert.match(alertMessage, /Proxies import complete/);
  const storage = await getStorage(session);
  const replaced = storage.proxies.find((proxy) => proxy.name === "DEV-HTTP-US");
  assert.equal(replaced.host, "198.51.100.10");
  assert.equal(storage.proxies.some((proxy) => proxy.name === "dev-new-fr"), true);
}

async function runSkipScenario(session) {
  await resetSeededStorage(session);
  const messages = await runImportWithDialogs(
    session,
    path.join(DEV_FIXTURES_DIR, "import-proxies-duplicate-replace-skip.json"),
    [false, true]
  );
  const alertMessage = messages[1];

  assert.match(alertMessage, /Proxies import complete/);
  const storage = await getStorage(session);
  const existing = storage.proxies.find((proxy) => proxy.name === "dev-http-us");
  assert.equal(existing.host, "127.0.0.1");
  assert.equal(storage.proxies.some((proxy) => proxy.name === "dev-new-fr"), true);
  assert.equal(storage.proxies.some((proxy) => proxy.name === "DEV-HTTP-US"), false);
}

async function runInvalidDuplicateScenario(session) {
  await resetSeededStorage(session);
  const messages = await runImportWithDialogs(
    session,
    path.join(DEV_FIXTURES_DIR, "import-proxies-duplicate-error.json"),
    [true]
  );
  const alertMessage = messages[0];

  assert.match(alertMessage, /Error importing proxies/);
  assert.match(alertMessage, /Duplicate proxy name in import/);
  const storage = await getStorage(session);
  assert.equal(storage.proxies.length, 3);
}

export async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  const browserPath = args.browser || findBrowserExecutable();
  if (!browserPath) {
    throw new Error(
      "Could not find Chrome/Chromium. Set CHROME_PATH or pass --browser <path>."
    );
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-ext-e2e-"));
  const profileDir = path.join(workDir, "chrome-profile");
  fs.mkdirSync(profileDir, { recursive: true });
  const extensionRoot = REPO_ROOT;
  const browser = launchChrome({
    browserPath,
    extensionRoot,
    profileDir,
    headed: args.headed,
  });

  const stderrChunks = [];
  browser.stderr.on("data", (chunk) => stderrChunks.push(String(chunk)));

  let session = null;
  try {
    console.log("Waiting for Chrome remote debugging port...");
    const debugPort = await readDevToolsPort(profileDir);
    console.log(`Chrome remote debugging port: ${debugPort}`);
    console.log("Resolving extension id...");
    const extensionId = await getExtensionId(
      debugPort,
      profileDir,
      extensionRoot
    );
    console.log(`Extension id: ${extensionId}`);
    console.log("Opening extension popup target...");
    session = await openPopupSession(debugPort, extensionId);

    console.log("Running proxy import duplicate replace flow...");
    await runReplaceScenario(session);
    console.log("PASS proxy import duplicate replace flow");
    console.log("Running proxy import duplicate skip flow...");
    await runSkipScenario(session);
    console.log("PASS proxy import duplicate skip flow");
    console.log("Running proxy import duplicate validation flow...");
    await runInvalidDuplicateScenario(session);
    console.log("PASS proxy import duplicate validation flow");
  } finally {
    session?.close();
    await stopBrowser(browser);
    if (!args.keepProfile) {
      removeWorkDir(workDir);
    } else {
      console.log(`Kept e2e profile at ${profileDir}`);
    }
  }

  if (browser.exitCode && browser.exitCode !== 0) {
    console.warn(stderrChunks.join(""));
  }

  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
