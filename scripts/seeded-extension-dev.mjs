import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEV_SEED_VERSION = "test-02";
const DEV_FIXTURES_DIR = path.join("examples", "dev");
const BACKGROUND_PATH = path.join("extension", "background", "background.js");
const DEV_SEED_PATH = path.join("extension", "dev-seed.js");

const DEFAULT_START_URLS = [
  "https://example.com",
  "https://shop.example.test",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = {
    browser: null,
    dryRun: false,
    keepProfile: false,
    keepExtension: false,
    profileDir: null,
    workDir: null,
    startUrls: [...DEFAULT_START_URLS],
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--browser") {
      args.browser = argv[++i] || null;
    } else if (token === "--profile-dir") {
      args.profileDir = argv[++i] || null;
    } else if (token === "--work-dir") {
      args.workDir = argv[++i] || null;
    } else if (token === "--url") {
      args.startUrls.push(argv[++i] || "");
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--keep-profile") {
      args.keepProfile = true;
    } else if (token === "--keep-extension") {
      args.keepExtension = true;
    } else if (token === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  args.startUrls = args.startUrls.filter(Boolean);
  return args;
}

function printHelp() {
  console.log([
    "Usage: npm run dev:seeded -- [options]",
    "",
    "Options:",
    "  --browser <path>       Browser executable path. Also supports CHROME_PATH.",
    "  --profile-dir <path>   Use a specific isolated browser profile directory.",
    "  --work-dir <path>      Use a specific work directory for temp files.",
    "  --url <url>            Open an additional URL after launch.",
    "  --dry-run              Prepare the temp extension/profile and exit.",
    "  --keep-profile         Do not delete the browser profile after exit.",
    "  --keep-extension       Do not delete the generated extension copy after exit.",
    "  --help                 Show this message.",
  ].join("\n"));
}

export function findBrowserExecutable({
  platform = process.platform,
  env = process.env,
  existsSync = fs.existsSync,
} = {}) {
  const explicitPath = env.CHROME_PATH || env.BROWSER_PATH;
  if (explicitPath) {
    return explicitPath;
  }

  const candidatesByPlatform = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
    ],
  };

  const candidates = candidatesByPlatform[platform] || [];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

export function loadSeedData(repoRoot = DEFAULT_REPO_ROOT) {
  const fixturesRoot = path.join(repoRoot, DEV_FIXTURES_DIR);
  const proxies = readJson(path.join(fixturesRoot, "seeded-proxies.json"));
  const siteRules = readJson(path.join(fixturesRoot, "seeded-site-rules.json"));

  return {
    proxies,
    siteRules,
    globalProxyEnabled: false,
    lastSelectedProxy: proxies[0]?.name || null,
    temporaryDirectSites: {},
    temporaryProxySites: {
      "shop.example.test": proxies[1]?.name || proxies[0]?.name || null,
    },
    loggingEnabled: true,
  };
}

function createSeedModule(seedData) {
  return `import { STORAGE_KEYS } from "./utils.js";

const DEV_SEED_VERSION = ${JSON.stringify(DEV_SEED_VERSION)};
const DEV_SEED_MARKER_KEY = "__devSeedProfile";
const SEED_DATA = ${JSON.stringify(seedData, null, 2)};

async function seedDevProfile() {
  const marker = await chrome.storage.local.get(DEV_SEED_MARKER_KEY);
  if (marker[DEV_SEED_MARKER_KEY]?.version === DEV_SEED_VERSION) {
    return;
  }

  await chrome.storage.sync.set({
    [STORAGE_KEYS.proxies]: SEED_DATA.proxies,
    [STORAGE_KEYS.siteRules]: SEED_DATA.siteRules,
    [STORAGE_KEYS.globalProxyEnabled]: SEED_DATA.globalProxyEnabled,
    [STORAGE_KEYS.lastSelectedProxy]: SEED_DATA.lastSelectedProxy,
    [STORAGE_KEYS.temporaryDirectSites]: SEED_DATA.temporaryDirectSites,
    [STORAGE_KEYS.temporaryProxySites]: SEED_DATA.temporaryProxySites,
    [STORAGE_KEYS.loggingEnabled]: SEED_DATA.loggingEnabled,
  });

  await chrome.storage.local.set({
    [DEV_SEED_MARKER_KEY]: {
      version: DEV_SEED_VERSION,
      seededAt: new Date().toISOString(),
    },
  });

  console.info("[ProxyExt Dev] Seeded extension profile", SEED_DATA);
}

seedDevProfile().catch((error) => {
  console.error("[ProxyExt Dev] Failed to seed extension profile", error);
});
`;
}

function patchManifest(tempRoot) {
  const manifestPath = path.join(tempRoot, "manifest.json");
  const manifest = readJson(manifestPath);
  manifest.name = `${manifest.name} (Seeded Dev)`;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function patchBackground(tempRoot) {
  const backgroundPath = path.join(tempRoot, BACKGROUND_PATH);
  const background = fs.readFileSync(backgroundPath, "utf8");
  const seedImport = "\nimport \"../dev-seed.js\";\n";
  fs.writeFileSync(backgroundPath, `${background}${seedImport}`, "utf8");
}

export function prepareSeededExtension({
  repoRoot = DEFAULT_REPO_ROOT,
  workDir = null,
  profileDir = null,
} = {}) {
  const root = workDir || fs.mkdtempSync(path.join(os.tmpdir(), "proxy-ext-dev-"));
  fs.mkdirSync(root, { recursive: true });

  const extensionRoot = path.join(root, "extension-root");
  const browserProfileDir = profileDir || path.join(root, "chrome-profile");
  fs.rmSync(extensionRoot, { recursive: true, force: true });
  fs.mkdirSync(extensionRoot, { recursive: true });
  fs.mkdirSync(browserProfileDir, { recursive: true });

  fs.copyFileSync(
    path.join(repoRoot, "manifest.json"),
    path.join(extensionRoot, "manifest.json")
  );
  fs.cpSync(
    path.join(repoRoot, "extension"),
    path.join(extensionRoot, "extension"),
    { recursive: true }
  );

  const seedData = loadSeedData(repoRoot);
  fs.writeFileSync(
    path.join(extensionRoot, DEV_SEED_PATH),
    createSeedModule(seedData),
    "utf8"
  );
  patchManifest(extensionRoot);
  patchBackground(extensionRoot);

  return {
    workDir: root,
    extensionRoot,
    profileDir: browserProfileDir,
    seedData,
  };
}

function launchBrowser({ browserPath, extensionRoot, profileDir, startUrls }) {
  const args = [
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionRoot}`,
    `--load-extension=${extensionRoot}`,
    "--no-first-run",
    "--no-default-browser-check",
    ...startUrls,
  ];

  return spawn(browserPath, args, {
    stdio: "inherit",
  });
}

function cleanupPath(targetPath, label) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Could not remove ${label} at ${targetPath}: ${error.message}`);
  }
}

export async function run(argv = process.argv.slice(2), repoRoot = DEFAULT_REPO_ROOT) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  const prepared = prepareSeededExtension({
    repoRoot,
    workDir: args.workDir,
    profileDir: args.profileDir,
  });

  console.log(`Prepared seeded extension: ${prepared.extensionRoot}`);
  console.log(`Prepared isolated profile: ${prepared.profileDir}`);
  console.log(`Seeded proxies: ${prepared.seedData.proxies.length}`);
  console.log(`Seeded site rules: ${Object.keys(prepared.seedData.siteRules).length}`);
  console.log(`Import fixtures: ${path.join(repoRoot, DEV_FIXTURES_DIR)}`);

  if (args.dryRun) {
    if (!args.keepExtension && !args.keepProfile && !args.workDir && !args.profileDir) {
      cleanupPath(prepared.workDir, "temporary work directory");
    }
    return 0;
  }

  const browserPath = args.browser || findBrowserExecutable();
  if (!browserPath) {
    throw new Error(
      "Could not find Chrome/Chromium. Set CHROME_PATH or pass --browser <path>."
    );
  }

  console.log(`Launching browser: ${browserPath}`);
  const browser = launchBrowser({
    browserPath,
    extensionRoot: prepared.extensionRoot,
    profileDir: prepared.profileDir,
    startUrls: args.startUrls,
  });

  const exitCode = await new Promise((resolve) => {
    browser.on("exit", (code) => resolve(code ?? 0));
  });

  if (!args.keepExtension && !args.keepProfile && !args.workDir && !args.profileDir) {
    cleanupPath(prepared.workDir, "temporary work directory");
  } else {
    if (!args.keepExtension && !args.workDir) {
      cleanupPath(prepared.extensionRoot, "temporary extension copy");
    }
    if (!args.keepProfile && !args.profileDir) {
      cleanupPath(prepared.profileDir, "temporary browser profile");
    }
  }

  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
