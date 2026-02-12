import {
  STORAGE_KEYS,
  createLogger,
  endsWithDomain,
  chooseDeterministicProxy,
} from "./utils.js";

const logger = createLogger(false);

let loggingEnabled = false;
const tabDomainById = new Map();

// Load initial logging state from storage
chrome.storage.sync.get(STORAGE_KEYS.loggingEnabled, (data) => {
  loggingEnabled = !!data[STORAGE_KEYS.loggingEnabled];
  logger.setEnabled(loggingEnabled);
  // Logs enabled — re-apply settings to see debug output
  if (loggingEnabled) applyProxySettings();
});

// Aliases for convenience
const logDebug = (...args) => logger.debug(...args);
const logInfo = (...args) => logger.info(...args);
const logWarn = (...args) => logger.warn(...args);
const logError = (...args) => logger.error(...args);

logDebug("Background script loaded");

const isReloadableUrl = (url) => {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    logDebug("Skipping reload for invalid URL:", url, error);
    return false;
  }
};

const getActiveTab = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const err = chrome.runtime.lastError;
      if (err) {
        logError("Failed to query active tab:", err);
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
      logDebug("Skipping reload for unsupported URL:", tab.url);
    }
    return false;
  }

  return new Promise((resolve) => {
    chrome.tabs.reload(tab.id, {}, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        logError("Failed to reload active tab:", err);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
};

// Build PAC script text from current settings
async function buildPacScript() {
  try {
    logDebug("Building PAC script...");
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const proxies = settings.proxies || [];
    const siteRules = settings.siteRules || {};
    const globalProxyEnabled = !!settings.globalProxyEnabled;
    const lastSelectedProxyName = settings.lastSelectedProxy || null;
    const temporaryDirectSites = settings.temporaryDirectSites || {};
    const temporaryProxySites = settings.temporaryProxySites || {};

    logDebug("Storage data:", {
      proxies: proxies.length,
      siteRules: Object.keys(siteRules).length,
      globalProxyEnabled,
      lastSelectedProxyName,
    });

    const pacProxies = proxies.map((p) => {
      const scheme = (p.protocol || "http").toLowerCase();
      let keyword = "PROXY";
      if (scheme === "socks5") keyword = "SOCKS5";
      else if (scheme === "socks4" || scheme === "socks") keyword = "SOCKS";
      return { name: p.name, pacString: `${keyword} ${p.host}:${p.port}` };
    });

    const pac = `function FindProxyForURL(url, host) {
var proxies = ${JSON.stringify(pacProxies)};
var rules = ${JSON.stringify(siteRules)};
var globalProxyEnabled = ${globalProxyEnabled};
var lastSelectedProxyName = ${JSON.stringify(lastSelectedProxyName)};
 var temporaryDirectSites = ${JSON.stringify(temporaryDirectSites)};
 var temporaryProxySites = ${JSON.stringify(temporaryProxySites)};
 
 function findProxyByName(name) {

  for (var i = 0; i < proxies.length; i++) {
    if (proxies[i].name === name) return proxies[i].pacString;
  }
  return "DIRECT";
}

function chooseRandomProxy(h) {
  var availableProxies = proxies.map(function(p) { return p.pacString; });
  var n = availableProxies.length;
  if (n === 0) return "DIRECT";
  var sum = 0;
  for (var i = 0; i < h.length; i++) { sum = (sum * 31 + h.charCodeAt(i)) >>> 0; }
  var idx = sum % n;
  return availableProxies[idx];
}

function endsWithDomain(h, d) {
  if (h === d) return true;
  return h.length > d.length && h.substr(h.length - d.length - 1) === "." + d;
}

// Find most specific matching rule
var matchedDomain = null;
var matchingRule = null;
for (var domain in rules) {
  if (!rules.hasOwnProperty(domain)) continue;
  if (endsWithDomain(host, domain)) {
    if (!matchedDomain || domain.length > matchedDomain.length) {
      matchedDomain = domain;
      matchingRule = rules[domain];
    }
  }
}

// 1. Temporary direct override
if (temporaryDirectSites[host]) { return "DIRECT"; }

// 2. Site-specific rules
if (matchingRule && matchingRule.type) {
  if (matchingRule.type === "NO_PROXY" || matchingRule.type === "DIRECT_TEMPORARY") return "DIRECT";
  if (matchingRule.type === "RANDOM_PROXY") return chooseRandomProxy(host);
  if (matchingRule.type === "PROXY_BY_RULE" && matchingRule.proxyName) {
    return findProxyByName(matchingRule.proxyName);
  }
}

// 3. Temporary per-site proxy override
if (temporaryProxySites[host]) {
  var tempProxyName = temporaryProxySites[host];
  if (tempProxyName === true) tempProxyName = lastSelectedProxyName;
  return findProxyByName(tempProxyName);
}

// 4. Global proxy handling
if (globalProxyEnabled) {
  return findProxyByName(lastSelectedProxyName);
}

return "DIRECT";
}`;
    logDebug("Generated PAC script length:", pac.length);
    logDebug("PAC preview:", pac.substring(0, 300) + "...");
    return pac;
  } catch (error) {
    logError("Error building PAC script:", error);
    return `function FindProxyForURL(url, host) { return "DIRECT"; }`;
  }
}

// Apply proxy settings based on current storage
async function applyProxySettings(options = {}) {
  const reloadActiveTab = !!options.reloadActiveTab;
  const maybeReloadActiveTab = () => {
    if (reloadActiveTab) {
      reloadActiveTabIfAllowed();
    }
  };

  const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  const globalProxyEnabled = !!settings.globalProxyEnabled;
  const siteRules = settings.siteRules || {};
  const temporaryDirectSites = settings.temporaryDirectSites || {};
  let temporaryProxySites = settings.temporaryProxySites || {};
  const proxies = settings.proxies || [];
  const lastSelectedProxyName = settings.lastSelectedProxy || null;

  if (!lastSelectedProxyName && Object.keys(temporaryProxySites).length > 0) {
    const cleanedTemporaryProxySites = { ...temporaryProxySites };
    let removed = false;
    for (const domain in cleanedTemporaryProxySites) {
      if (cleanedTemporaryProxySites[domain] === true) {
        delete cleanedTemporaryProxySites[domain];
        removed = true;
      }
    }
    if (removed) {
      logWarn("Clearing legacy temporary proxy sites without selected proxy");
      await chrome.storage.sync.set({
        [STORAGE_KEYS.temporaryProxySites]: cleanedTemporaryProxySites,
      });
      temporaryProxySites = cleanedTemporaryProxySites;
    }
  }

  logDebug("Applying proxy settings:", {
    globalProxyEnabled,
    lastSelectedProxyName,
  });

  const bypassList = [...Object.keys(temporaryDirectSites)];
  const onlyProxyDomains = Object.keys(temporaryProxySites).filter((domain) => {
    const value = temporaryProxySites[domain];
    if (typeof value === "string" && value.trim()) return true;
    if (value === true) return !!lastSelectedProxyName;
    return false;
  });
  for (const domain in siteRules) {
    if (
      siteRules[domain].type === "NO_PROXY" ||
      siteRules[domain].type === "DIRECT_TEMPORARY"
    ) {
      bypassList.push(domain);
    }
  }

  const hasComplexRulesRequiringPac = Object.values(siteRules).some(
    (rule) =>
      rule.type === "RANDOM_PROXY" ||
      (rule.type === "PROXY_BY_RULE" && rule.proxyName)
  );

  const hasOnlyProxyDomains = onlyProxyDomains.length > 0;
  if (onlyProxyDomains.length > 0 && !lastSelectedProxyName) {
    logWarn("Per-site proxy requested without selected proxy");
  }

  // 1. Per-site proxy only -> PAC (overrides global)
  if (hasOnlyProxyDomains) {
    const pacData = await buildPacScript();
    logDebug("Applying PAC script for per-site proxy only...");
    chrome.proxy.settings.set(
      {
        value: { mode: "pac_script", pacScript: { data: pacData } },
        scope: "regular",
      },
      () => {
        if (chrome.runtime.lastError)
          logError("PAC mode error:", chrome.runtime.lastError.message);
        else {
          logDebug("PAC script applied successfully.");
          maybeReloadActiveTab();
        }
      }
    );
    return;
  }

  // 2. Global proxy enabled -> fixed_servers
  if (globalProxyEnabled) {
    const selectedProxy = proxies.find((p) => p.name === lastSelectedProxyName);
    if (!selectedProxy) {
      logDebug("No selected proxy for fixed_servers, setting direct.");
      chrome.proxy.settings.set(
        {
          value: { mode: "direct" },
          scope: "regular",
        },
        () => {
          if (chrome.runtime.lastError)
            logError("Direct mode error:", chrome.runtime.lastError.message);
          else {
            logDebug("Direct mode applied successfully.");
            maybeReloadActiveTab();
          }
        }
      );
      return;
    }

    let scheme = "http";
    if (selectedProxy.protocol) {
      const protocol = selectedProxy.protocol.toLowerCase();
      if (protocol === "socks5" || protocol === "socks4") scheme = protocol;
      else if (protocol === "https") scheme = "https";
    }

    logDebug(
      `Using proxy: ${selectedProxy.name} (${scheme}://${selectedProxy.host}:${selectedProxy.port})`
    );

    const proxyConfig = {
      mode: "fixed_servers",
      rules: {
        proxyForHttp: {
          scheme,
          host: selectedProxy.host,
          port: selectedProxy.port,
        },
        proxyForHttps: {
          scheme,
          host: selectedProxy.host,
          port: selectedProxy.port,
        },
        bypassList,
      },
    };

    logDebug(
      "Applying fixed_servers config:",
      JSON.stringify(proxyConfig, null, 2)
    );

    chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
      if (chrome.runtime.lastError)
        logError("Fixed servers error:", chrome.runtime.lastError.message);
      else {
        logDebug("Fixed servers applied successfully.");
        chrome.proxy.settings.get({}, (config) => {
          logDebug("Current proxy config:", JSON.stringify(config, null, 2));
        });
        maybeReloadActiveTab();
      }
    });

    logDebug("=== APPLIED PROXY DEBUG ===");
    logDebug("Proxy name:", selectedProxy.name);
    logDebug("Proxy host:", selectedProxy.host);
    logDebug("Proxy port:", selectedProxy.port);
    logDebug("Proxy scheme:", scheme);
    logDebug("Proxy username:", selectedProxy.username ? "SET" : "NOT SET");
    logDebug("===========================");
    return;
  }

  // 3. No global proxy, but complex rules -> PAC
  if (hasComplexRulesRequiringPac) {
    const pacData = await buildPacScript();
    logDebug("Applying PAC script for complex rules (no global proxy)...");
    chrome.proxy.settings.set(
      {
        value: { mode: "pac_script", pacScript: { data: pacData } },
        scope: "regular",
      },
      () => {
        if (chrome.runtime.lastError)
          logError("PAC mode error:", chrome.runtime.lastError.message);
        else {
          logDebug("PAC script applied successfully.");
          maybeReloadActiveTab();
        }
      }
    );
    return;
  }

  // 4. Nothing active -> direct
  logDebug("No proxying active, setting direct mode.");
  chrome.proxy.settings.set(
    { value: { mode: "direct" }, scope: "regular" },
    () => {
      if (chrome.runtime.lastError)
        logError("Direct mode error:", chrome.runtime.lastError.message);
      else {
        logDebug("Direct mode applied successfully.");
        maybeReloadActiveTab();
      }
    }
  );
}

// Initial application of proxy settings
applyProxySettings();

// Debounce to prevent rapid re-applications
let applyTimeout = null;
const debouncedApply = () => {
  if (applyTimeout) clearTimeout(applyTimeout);
  applyTimeout = setTimeout(applyProxySettings, 100);
};

// React to storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes) return;

  logDebug("Storage changed:", Object.keys(changes));

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
    // Logs were just enabled — re-apply settings to see debug output
    if (loggingEnabled) applyProxySettings();
  }

  debouncedApply();
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applyProxy") {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.globalProxyEnabled]: true,
        [STORAGE_KEYS.lastSelectedProxy]: request.proxyName,
      },
      () => {
        applyProxySettings({ reloadActiveTab: !!request.reloadActiveTab });
        setTimeout(checkCurrentProxySettings, 1000);
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
        applyProxySettings({ reloadActiveTab: !!request.reloadActiveTab });
        setTimeout(checkCurrentProxySettings, 1000);
      }
    );
  } else if (request.action === "updateProxySettings") {
    applyProxySettings({ reloadActiveTab: !!request.reloadActiveTab });
    setTimeout(checkCurrentProxySettings, 1000);
  } else if (request.action === "setTemporaryDirect") {
    chrome.storage.sync.get(STORAGE_KEYS.temporaryDirectSites, (data) => {
      let temporaryDirectSites = data[STORAGE_KEYS.temporaryDirectSites] || {};
      if (request.enabled) temporaryDirectSites[request.domain] = true;
      else delete temporaryDirectSites[request.domain];
      chrome.storage.sync.set(
        { [STORAGE_KEYS.temporaryDirectSites]: temporaryDirectSites },
        () => {
          applyProxySettings();
          setTimeout(checkCurrentProxySettings, 1000);
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
      // Logs enabled — re-apply settings to see debug output
      if (loggingEnabled) applyProxySettings();
    });
  }
});

const rememberTabDomain = (tabId, url) => {
  if (!url) return;
  try {
    const hostname = new URL(url).hostname;
    if (hostname) tabDomainById.set(tabId, hostname);
  } catch (error) {
    logDebug("Failed to parse tab URL", url, error);
  }
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const nextUrl = changeInfo.url || tab.url;
  rememberTabDomain(tabId, nextUrl);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const domain = tabDomainById.get(tabId);
  tabDomainById.delete(tabId);
  if (!domain) return;
  chrome.storage.sync.get(STORAGE_KEYS.temporaryProxySites, (data) => {
    const temporaryProxySites = data[STORAGE_KEYS.temporaryProxySites] || {};
    if (!temporaryProxySites[domain]) return;
    delete temporaryProxySites[domain];
    chrome.storage.sync.set(
      { [STORAGE_KEYS.temporaryProxySites]: temporaryProxySites },
      () => {
        applyProxySettings();
        setTimeout(checkCurrentProxySettings, 1000);
      }
    );
  });
});

// Handle proxy authentication asynchronously
chrome.webRequest.onAuthRequired.addListener(
  (details, callbackFn) => {
    logDebug("onAuthRequired listener activated.");
    logDebug(
      "onAuthRequired triggered for",
      details.url,
      "isProxy:",
      details.isProxy,
      "challenger:",
      details.challenger
    );

    if (
      details.url.startsWith("wss://") &&
      details.url.includes("jivosite.com")
    ) {
      logDebug("Bypassing authentication for jivosite.com WebSocket.");
      callbackFn({});
      return;
    }

    if (!details.isProxy) {
      callbackFn({});
      return;
    }

    (async () => {
      try {
        const settings = await chrome.storage.sync.get(
          Object.values(STORAGE_KEYS)
        );
        const proxies = settings.proxies || [];
        const siteRules = settings.siteRules || {};
        const globalProxyEnabled = !!settings.globalProxyEnabled;
        const lastSelectedProxyName = settings.lastSelectedProxy || null;
        const temporaryDirectSites = settings.temporaryDirectSites || {};
        const temporaryProxySites = settings.temporaryProxySites || {};

        const challengerHost = details.challenger?.host;
        const challengerPort = details.challenger?.port;


        logDebug(
          "Auth lookup for challenger",
          challengerHost,
          ":",
          challengerPort
        );

        let targetHost = "";
        try {
          targetHost = new URL(details.url).hostname;
        } catch (e) {
          /* ignore */
        }

        if (temporaryDirectSites[targetHost]) {
          logDebug("Temporary direct, no auth");
          callbackFn({});
          return;
        }

        let selectedProxy =
          proxies.find(
            (p) =>
              p.host === challengerHost &&
              parseInt(p.port, 10) === challengerPort
          ) || null;

        if (!selectedProxy) {
          // Infer from rules / global settings
          let matchedDomain = null;
          for (const d in siteRules) {
            if (endsWithDomain(targetHost, d)) {
              if (!matchedDomain || d.length > matchedDomain.length)
                matchedDomain = d;
            }
          }
          const rule = matchedDomain ? siteRules[matchedDomain] : null;

          if (rule) {
            if (rule.type === "PROXY_BY_RULE" && rule.proxyName) {
              selectedProxy = proxies.find((p) => p.name === rule.proxyName);
            } else if (rule.type === "RANDOM_PROXY") {
              selectedProxy = chooseDeterministicProxy(targetHost, proxies);
              logDebug("=== PROXY AUTH DEBUG ===");
              logDebug("Selected proxy:", selectedProxy);
              logDebug("Challenger:", challengerHost, challengerPort);
              logDebug("Target host:", targetHost);
              logDebug("=======================");
            }
          } else if (temporaryProxySites[targetHost]) {
            const tempProxyName =
              temporaryProxySites[targetHost] === true
                ? lastSelectedProxyName
                : temporaryProxySites[targetHost];
            if (tempProxyName) {
              selectedProxy = proxies.find((p) => p.name === tempProxyName);
            }
          } else if (globalProxyEnabled && lastSelectedProxyName) {
            selectedProxy = proxies.find(
              (p) => p.name === lastSelectedProxyName
            );
          }

          if (!selectedProxy && temporaryProxySites[targetHost]) {
            logDebug("Temporary proxy enabled but no proxy found");
          }
        }

        logDebug(
          "Selected proxy for auth:",
          selectedProxy ? selectedProxy.name : "none"
        );

        if (selectedProxy && selectedProxy.username && selectedProxy.password) {
          logDebug("Providing credentials for", selectedProxy.name);
          callbackFn({
            authCredentials: {
              username: selectedProxy.username,
              password: selectedProxy.password,
            },
          });
        } else {
          logDebug("No credentials, letting Chrome prompt");
          callbackFn({});
        }
      } catch (error) {
        logError("Auth error:", error);
        callbackFn({});
      }
    })();
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

// Log proxy errors for debugging
chrome.proxy.onProxyError.addListener((details) => {
  logError("=== PROXY ERROR ===");
  logError("Error:", details.error);
  logError("URL:", details.url);
  logError("Details:", details.details);
  logError("Time:", new Date().toISOString());
  logError("==================");
});

function checkCurrentProxySettings() {
  chrome.proxy.settings.get({}, (config) => {
    logDebug("=== CURRENT PROXY SETTINGS ===");
    logDebug(JSON.stringify(config, null, 2));
    logDebug("==============================");
  });
}

async function testProxyConnection() {
  const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  logDebug("=== STORAGE SETTINGS ===");
  logDebug("Proxies:", settings.proxies);
  logDebug("Global enabled:", settings.globalProxyEnabled);
  logDebug("Last selected:", settings.lastSelectedProxy);
  logDebug("Site rules:", settings.siteRules);
  logDebug("Temporary direct:", settings.temporaryDirectSites);
  logDebug("=======================");
}
