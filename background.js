const STORAGE_KEYS = {
  proxies: "proxies",
  siteRules: "siteRules",
  globalProxyEnabled: "globalProxyEnabled",
  lastSelectedProxy: "lastSelectedProxy", // Stores the name of the last selected proxy
  temporaryDirectSites: "temporaryDirectSites", // New key for temporary direct access
};

console.log("Background script loaded");

// Helper function to check if a host ends with a given domain
function endsWithDomain(host, domain) {
  if (!host || !domain) return false;
  if (host === domain) return true;
  return (
    host.length > domain.length &&
    host.substr(host.length - domain.length - 1) === "." + domain
  );
}

// Deterministic random proxy selection based on host
function chooseDeterministicProxy(host, proxies) {
  const n = proxies.length;
  if (n === 0) return null;
  let sum = 0;
  for (let i = 0; i < host.length; i++) {
    sum = (sum * 31 + host.charCodeAt(i)) >>> 0;
  }
  const idx = n > 0 ? sum % n : 0;
  return proxies[idx] || null;
}

// Build PAC script text from current settings
async function buildPacScript() {
  try {
    console.log("Building PAC script...");
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const proxies = settings.proxies || [];
    const siteRules = settings.siteRules || {};
    const globalProxyEnabled = !!settings.globalProxyEnabled;
    const lastSelectedProxyName = settings.lastSelectedProxy || null;
    const temporaryDirectSites = settings.temporaryDirectSites || {};

    console.log("Storage data:", {
      proxies: proxies.length,
      siteRules: Object.keys(siteRules).length,
      globalProxyEnabled,
      lastSelectedProxyName,
    });

    const globalProxy =
      proxies.find((p) => p.name === lastSelectedProxyName) || null;

    // Prepare PAC-friendly proxy strings
    const pacProxies = proxies.map((p) => {
      const scheme = (p.protocol || "http").toLowerCase();
      let keyword = "PROXY";
      if (scheme === "socks5") keyword = "SOCKS5";
      else if (scheme === "socks") keyword = "SOCKS";
      let pacString = `${keyword} ${p.host}:${p.port}`;
      return {
        name: p.name,
        pacString,
      };
    });

    const pac = `function FindProxyForURL(url, host) {
var proxies = ${JSON.stringify(pacProxies)};
var rules = ${JSON.stringify(siteRules)};
var globalProxyEnabled = ${globalProxyEnabled};
var lastSelectedProxyName = ${JSON.stringify(lastSelectedProxyName)};
var temporaryDirectSites = ${JSON.stringify(temporaryDirectSites)};

function findProxyByName(name) {
  for (var i = 0; i < proxies.length; i++) {
      if (proxies[i].name === name) {
          return proxies[i].pacString;
      }
  }
  return "DIRECT";
}

function chooseRandomProxy(h) {
  var availableProxies = proxies.map(p => p.pacString);
  var n = availableProxies.length;
  if (n === 0) return "DIRECT";
  var sum = 0;
  for (var i = 0; i < h.length; i++) sum = (sum * 31 + h.charCodeAt(i)) >>> 0;
  var idx = n > 0 ? (sum % n) : 0;
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

// 1. Check for temporary direct override
if (temporaryDirectSites[host]) {
  return 'DIRECT';
}

// 2. Site-specific rules (whitelist/blacklist) - use most specific
if (matchingRule && matchingRule.type) {
  if (matchingRule.type === 'NO_PROXY' || matchingRule.type === 'DIRECT_TEMPORARY') return 'DIRECT';
  if (matchingRule.type === 'RANDOM_PROXY') return chooseRandomProxy(host);
  if (matchingRule.type === 'PROXY_BY_RULE' && matchingRule.proxyName) {
      return findProxyByName(matchingRule.proxyName);
  }
}

// 3. Global proxy handling
if (globalProxyEnabled) {
  return findProxyByName(lastSelectedProxyName);
}

return 'DIRECT';
}`;

    console.log("Generated PAC script length:", pac.length);
    console.log("PAC preview:", pac.substring(0, 300) + "...");
    return pac;
  } catch (error) {
    console.error("Error building PAC script:", error);
    return `function FindProxyForURL(url, host) { return "DIRECT"; }`; // Fallback to direct
  }
}

// Apply proxy settings based on current storage (hybrid fixed_servers for global + bypass, PAC for complex rules)
async function applyProxySettings() {
  const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  const globalProxyEnabled = !!settings.globalProxyEnabled;
  const siteRules = settings.siteRules || {};
  const temporaryDirectSites = settings.temporaryDirectSites || {};
  const proxies = settings.proxies || [];
  const lastSelectedProxyName = settings.lastSelectedProxy || null;

  console.log("Applying proxy settings:", {
    globalProxyEnabled,
    lastSelectedProxyName,
  });

  // Collect bypass domains (NO_PROXY rules and temporary direct)
  const bypassList = [...Object.keys(temporaryDirectSites)];
  for (const domain in siteRules) {
    if (siteRules[domain].type === "NO_PROXY") {
      bypassList.push(domain);
    }
  }

  // Check if complex rules (RANDOM_PROXY or PROXY_BY_RULE) exist
  const hasComplexRulesRequiringPac = Object.values(siteRules).some(
    (rule) =>
      rule.type === "RANDOM_PROXY" ||
      (rule.type === "PROXY_BY_RULE" && rule.proxyName)
  );

  // 1. If global proxy is enabled, use fixed_servers with bypassList
  if (globalProxyEnabled) {
    const selectedProxy = proxies.find((p) => p.name === lastSelectedProxyName);
    if (!selectedProxy) {
      console.log("No selected proxy for fixed_servers, setting direct.");
      chrome.proxy.settings.set({
        value: { mode: "direct" },
        scope: "regular",
      });
      return;
    }

    // Правильное определение схемы
    let scheme = "http"; // по умолчанию
    if (selectedProxy.protocol) {
      const protocol = selectedProxy.protocol.toLowerCase();
      if (protocol === "socks5" || protocol === "socks4") {
        scheme = protocol;
      } else if (protocol === "https") {
        scheme = "https";
      } else {
        scheme = "http";
      }
    }

    console.log(
      `Using proxy: ${selectedProxy.name} (${scheme}://${selectedProxy.host}:${selectedProxy.port})`
    );

    const proxyConfig = {
      mode: "fixed_servers",
      rules: {
        proxyForHttp: {
          scheme: scheme,
          host: selectedProxy.host,
          port: selectedProxy.port,
        },
        proxyForHttps: {
          scheme: scheme,
          host: selectedProxy.host,
          port: selectedProxy.port,
        },
        bypassList: bypassList,
      },
    };

    console.log(
      "Applying fixed_servers config:",
      JSON.stringify(proxyConfig, null, 2)
    );

    chrome.proxy.settings.set(
      {
        value: proxyConfig,
        scope: "regular",
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Fixed servers error:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log("Fixed servers applied successfully.");
          // Проверяем текущие настройки прокси
          chrome.proxy.settings.get({}, (config) => {
            console.log(
              "Current proxy config:",
              JSON.stringify(config, null, 2)
            );
          });
        }
      }
    );

    console.log("=== APPLIED PROXY DEBUG ===");
    console.log("Proxy name:", selectedProxy.name);
    console.log("Proxy host:", selectedProxy.host);
    console.log("Proxy port:", selectedProxy.port);
    console.log("Proxy scheme:", scheme);
    console.log("Proxy username:", selectedProxy.username ? "SET" : "NOT SET");
    console.log("===========================");

    return;
  }

  // 2. If global proxy is NOT enabled, but there are complex site rules, use PAC
  if (hasComplexRulesRequiringPac) {
    const pacData = await buildPacScript();
    console.log("Applying PAC script for complex rules (no global proxy)...");
    chrome.proxy.settings.set(
      {
        value: { mode: "pac_script", pacScript: { data: pacData } },
        scope: "regular",
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("PAC mode error:", chrome.runtime.lastError.message);
        } else {
          console.log("PAC script applied successfully.");
        }
      }
    );
    return;
  }

  // 3. Otherwise, no proxying active
  console.log("No proxying active, setting direct mode.");
  chrome.proxy.settings.set(
    {
      value: { mode: "direct" },
      scope: "regular",
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Direct mode error:", chrome.runtime.lastError.message);
      } else {
        console.log("Direct mode applied successfully.");
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
  if (area === "sync" && changes) {
    console.log("Storage changed:", Object.keys(changes));
    // Only re-apply PAC if relevant settings change
    const relevantKeys = [
      STORAGE_KEYS.proxies,
      STORAGE_KEYS.siteRules,
      STORAGE_KEYS.globalProxyEnabled,
      STORAGE_KEYS.lastSelectedProxy,
      STORAGE_KEYS.temporaryDirectSites, // Added new key
    ];
    const changedRelevantKey = relevantKeys.some((key) => changes[key]);
    if (changedRelevantKey) {
      debouncedApply();
    }
  }
});

// No need for tab listeners; PAC is evaluated per request, and storage changes trigger re-application

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applyProxy") {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.globalProxyEnabled]: true,
        [STORAGE_KEYS.lastSelectedProxy]: request.proxyName,
      },
      () => {
        applyProxySettings();
        // Проверяем настройки через 1 секунду
        setTimeout(checkCurrentProxySettings, 1000);
      }
    );
  } else if (request.action === "clearProxy") {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.globalProxyEnabled]: false,
        [STORAGE_KEYS.temporaryDirectSites]: {}, // Clear temporary overrides when global proxy is off
      },
      () => {
        applyProxySettings();
        setTimeout(checkCurrentProxySettings, 1000);
      }
    );
  } else if (request.action === "updateProxySettings") {
    applyProxySettings();
    setTimeout(checkCurrentProxySettings, 1000);
  } else if (request.action === "setTemporaryDirect") {
    // New action for temporary direct
    chrome.storage.sync.get(STORAGE_KEYS.temporaryDirectSites, (data) => {
      let temporaryDirectSites = data[STORAGE_KEYS.temporaryDirectSites] || {};
      if (request.enabled) {
        temporaryDirectSites[request.domain] = true;
      } else {
        delete temporaryDirectSites[request.domain];
      }
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
  }
});

// Handle proxy authentication asynchronously (MV3 compatible, no "blocking")
chrome.webRequest.onAuthRequired.addListener(
  (details, callbackFn) => {
    console.log("onAuthRequired listener activated.");
    console.log(
      "onAuthRequired triggered for",
      details.url,
      "isProxy:",
      details.isProxy,
      "challenger:",
      details.challenger
    );
    // Explicitly bypass jivosite.com for authentication if it's a WebSocket
    if (
      details.url.startsWith("wss://") &&
      details.url.includes("jivosite.com")
    ) {
      console.log("Bypassing authentication for jivosite.com WebSocket.");
      callbackFn({});
      return;
    }
    if (!details.isProxy) {
      callbackFn({}); // No auth for non-proxy
      return;
    }

    // Async resolve with credentials
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

        const challengerHost = details.challenger?.host;
        const challengerPort = details.challenger?.port;

        console.log(
          "Auth lookup for challenger",
          challengerHost,
          ":",
          challengerPort
        );

        // Skip if temporary direct for target
        let targetHost = "";
        try {
          targetHost = new URL(details.url).hostname;
        } catch (e) {}

        if (temporaryDirectSites[targetHost]) {
          console.log("Temporary direct, no auth");
          callbackFn({}); // Direct, no auth
          return;
        }

        // Find proxy for auth (direct match or inferred)
        let selectedProxy = null;

        // Direct match by challenger host:port
        selectedProxy = proxies.find(
          (p) =>
            p.host === challengerHost && parseInt(p.port, 10) === challengerPort
        );

        if (!selectedProxy) {
          // Infer from target via rules/global
          let matchedDomain = null;
          for (const d in siteRules) {
            if (endsWithDomain(targetHost, d)) {
              if (!matchedDomain || d.length > matchedDomain.length) {
                matchedDomain = d;
              }
            }
          }
          const rule = matchedDomain ? siteRules[matchedDomain] : null;

          if (rule) {
            if (rule.type === "PROXY_BY_RULE" && rule.proxyName) {
              selectedProxy = proxies.find((p) => p.name === rule.proxyName);
            } else if (rule.type === "RANDOM_PROXY") {
              selectedProxy = chooseDeterministicProxy(targetHost, proxies);
              console.log("=== PROXY AUTH DEBUG ===");
              console.log("Selected proxy:", selectedProxy);
              console.log("Challenger:", challengerHost, challengerPort);
              console.log("Target host:", targetHost);
              console.log("=======================");
            }
          } else if (globalProxyEnabled && lastSelectedProxyName) {
            selectedProxy = proxies.find(
              (p) => p.name === lastSelectedProxyName
            );
          }
        }

        console.log(
          "Selected proxy for auth:",
          selectedProxy ? selectedProxy.name : "none"
        );

        if (selectedProxy && selectedProxy.username && selectedProxy.password) {
          console.log("Providing credentials for", selectedProxy.name);
          callbackFn({
            authCredentials: {
              username: selectedProxy.username,
              password: selectedProxy.password,
            },
          });
        } else {
          console.log("No credentials, letting Chrome prompt");
          // No stored credentials, let Chrome prompt
          callbackFn({});
        }
      } catch (error) {
        console.error("Auth error:", error);
        callbackFn({});
      }
    })();
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"] // MV3 async auth mode
);

// Note: Proxy authentication now handled asynchronously with stored credentials or browser prompt.

// Log proxy errors for debugging
chrome.proxy.onProxyError.addListener((details) => {
  console.error("Proxy error:", details.error, "for URL:", details.url);
});

function checkCurrentProxySettings() {
  chrome.proxy.settings.get({}, (config) => {
    console.log("=== CURRENT PROXY SETTINGS ===");
    console.log(JSON.stringify(config, null, 2));
    console.log("==============================");
  });
}

async function testProxyConnection() {
  const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  console.log("=== STORAGE SETTINGS ===");
  console.log("Proxies:", settings.proxies);
  console.log("Global enabled:", settings.globalProxyEnabled);
  console.log("Last selected:", settings.lastSelectedProxy);
  console.log("Site rules:", settings.siteRules);
  console.log("Temporary direct:", settings.temporaryDirectSites);
  console.log("=======================");
}

chrome.proxy.onProxyError.addListener((details) => {
  console.error("=== PROXY ERROR ===");
  console.error("Error:", details.error);
  console.error("URL:", details.url);
  console.error("Details:", details.details);
  console.error("Time:", new Date().toISOString());
  console.error("==================");
});
