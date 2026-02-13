import { STORAGE_KEYS, TIMEOUTS, createLogger } from "../utils.js";
import { applyProxySettings } from "./proxy-modes.js";
import { registerAuthHandler } from "./auth-handler.js";
import { initTabTracker } from "./tab-tracker.js";

// --- Logger setup ---
const logger = createLogger(false);

let loggingEnabled = false;

// Load initial logging state from storage
chrome.storage.sync.get(STORAGE_KEYS.loggingEnabled, (data) => {
  loggingEnabled = !!data[STORAGE_KEYS.loggingEnabled];
  logger.setEnabled(loggingEnabled);
  if (loggingEnabled) applySettings();
});

logger.debug("Background script loaded");

// --- Tab reload helpers ---
const isReloadableUrl = (url) => {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    logger.debug("Skipping reload for invalid URL:", url, error);
    return false;
  }
};

const getActiveTab = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const err = chrome.runtime.lastError;
      if (err) {
        logger.error("Failed to query active tab:", err);
        resolve(null);
        return;
      }
      resolve(tabs && tabs.length > 0 ? tabs[0] : null);
    });
  });
};

const reloadActiveTabIfAllowed = async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id || !isReloadableUrl(tab.url)) {
    if (tab && tab.url) {
      logger.debug("Skipping reload for unsupported URL:", tab.url);
    }
    return false;
  }

  return new Promise((resolve) => {
    chrome.tabs.reload(tab.id, {}, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        logger.error("Failed to reload active tab:", err);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
};

// --- Debug helpers ---
function checkCurrentProxySettings() {
  chrome.proxy.settings.get({}, (config) => {
    logger.debug("=== CURRENT PROXY SETTINGS ===");
    logger.debug(JSON.stringify(config, null, 2));
    logger.debug("==============================");
  });
}

async function testProxyConnection() {
  const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  logger.debug("=== STORAGE SETTINGS ===");
  logger.debug("Proxies:", settings.proxies);
  logger.debug("Global enabled:", settings.globalProxyEnabled);
  logger.debug("Last selected:", settings.lastSelectedProxy);
  logger.debug("Site rules:", settings.siteRules);
  logger.debug("Temporary direct:", settings.temporaryDirectSites);
  logger.debug("=======================");
}

// --- Convenience wrapper for applyProxySettings ---
function applySettings(options = {}) {
  return applyProxySettings({
    ...options,
    logger,
    reloadActiveTabIfAllowed,
  });
}

// --- Initial application ---
applySettings();

// --- Debounce ---
let applyTimeout = null;
const debouncedApply = () => {
  if (applyTimeout) clearTimeout(applyTimeout);
  applyTimeout = setTimeout(() => applySettings(), TIMEOUTS.debounceApply);
};

// --- Storage change listener ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes) return;

  logger.debug("Storage changed:", Object.keys(changes));

  const relevantKeys = [
    STORAGE_KEYS.proxies,
    STORAGE_KEYS.siteRules,
    STORAGE_KEYS.globalProxyEnabled,
    STORAGE_KEYS.lastSelectedProxy,
    STORAGE_KEYS.temporaryDirectSites,
    STORAGE_KEYS.temporaryProxySites,
    STORAGE_KEYS.loggingEnabled,
  ];

  const changedRelevantKey = relevantKeys.some((key) => changes[key]);
  if (!changedRelevantKey) return;

  if (changes[STORAGE_KEYS.loggingEnabled]) {
    loggingEnabled = !!changes[STORAGE_KEYS.loggingEnabled].newValue;
    logger.setEnabled(loggingEnabled);
    if (loggingEnabled) applySettings();
  }

  debouncedApply();
});

// --- Message router ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applyProxy") {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.globalProxyEnabled]: true,
        [STORAGE_KEYS.lastSelectedProxy]: request.proxyName,
      },
      () => {
        applySettings({ reloadActiveTab: !!request.reloadActiveTab });
        setTimeout(checkCurrentProxySettings, TIMEOUTS.proxyCheckDelay);
      }
    );
  } else if (request.action === "clearProxy") {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.globalProxyEnabled]: false,
        [STORAGE_KEYS.temporaryDirectSites]: {},
        [STORAGE_KEYS.temporaryProxySites]: {},
      },
      () => {
        applySettings({ reloadActiveTab: !!request.reloadActiveTab });
        setTimeout(checkCurrentProxySettings, TIMEOUTS.proxyCheckDelay);
      }
    );
  } else if (request.action === "updateProxySettings") {
    applySettings({ reloadActiveTab: !!request.reloadActiveTab });
    setTimeout(checkCurrentProxySettings, TIMEOUTS.proxyCheckDelay);
  } else if (request.action === "setTemporaryDirect") {
    chrome.storage.sync.get(STORAGE_KEYS.temporaryDirectSites, (data) => {
      let temporaryDirectSites = data[STORAGE_KEYS.temporaryDirectSites] || {};
      if (request.enabled) temporaryDirectSites[request.domain] = true;
      else delete temporaryDirectSites[request.domain];
      chrome.storage.sync.set(
        { [STORAGE_KEYS.temporaryDirectSites]: temporaryDirectSites },
        () => {
          applySettings();
          setTimeout(checkCurrentProxySettings, TIMEOUTS.proxyCheckDelay);
        }
      );
    });
  } else if (request.action === "testProxy") {
    testProxyConnection();
    checkCurrentProxySettings();
    sendResponse({ success: true });
  } else if (request.action === "setLoggingEnabled") {
    const next = !!request.enabled;
    chrome.storage.sync.set({ [STORAGE_KEYS.loggingEnabled]: next }, () => {
      loggingEnabled = next;
      logger.setEnabled(loggingEnabled);
      if (loggingEnabled) applySettings();
    });
  }
});

// --- Register auth handler ---
registerAuthHandler(logger);

// --- Register tab tracker ---
initTabTracker({
  logger,
  applyProxySettings: () => applySettings(),
  checkCurrentProxySettings,
});

// --- Proxy error logging ---
chrome.proxy.onProxyError.addListener((details) => {
  logger.error("=== PROXY ERROR ===");
  logger.error("Error:", details.error);
  logger.error("URL:", details.url);
  logger.error("Details:", details.details);
  logger.error("Time:", new Date().toISOString());
  logger.error("==================");
});
