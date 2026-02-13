import { STORAGE_KEYS } from "../utils.js";
import * as storage from "../shared/storage.js";
import { buildPacScript } from "./pac-builder.js";

/**
 * Apply PAC script mode (used for per-site proxy and complex rules).
 * @param {Object} opts
 * @param {Object} opts.logger
 * @param {Function} opts.maybeReload - Callback to reload active tab.
 */
export async function applyPacMode({ logger, maybeReload }) {
  const pacData = await buildPacScript(logger);
  logger.debug("Applying PAC script...");
  chrome.proxy.settings.set(
    {
      value: { mode: "pac_script", pacScript: { data: pacData } },
      scope: "regular",
    },
    () => {
      if (chrome.runtime.lastError) {
        logger.error("PAC mode error:", chrome.runtime.lastError.message);
      } else {
        logger.debug("PAC script applied successfully.");
        maybeReload();
      }
    }
  );
}

/**
 * Apply fixed_servers mode for a single global proxy.
 * @param {Object} opts
 * @param {Object} opts.selectedProxy - Proxy object with host, port, protocol, name, username.
 * @param {Array} opts.bypassList - Domains to bypass.
 * @param {Object} opts.logger
 * @param {Function} opts.maybeReload
 */
export function applyFixedServers({ selectedProxy, bypassList, logger, maybeReload }) {
  let scheme = "http";
  if (selectedProxy.protocol) {
    const protocol = selectedProxy.protocol.toLowerCase();
    if (protocol === "socks5" || protocol === "socks4") scheme = protocol;
    else if (protocol === "https") scheme = "https";
  }

  logger.debug(
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

  logger.debug(
    "Applying fixed_servers config:",
    JSON.stringify(proxyConfig, null, 2)
  );

  chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
    if (chrome.runtime.lastError) {
      logger.error("Fixed servers error:", chrome.runtime.lastError.message);
    } else {
      logger.debug("Fixed servers applied successfully.");
      chrome.proxy.settings.get({}, (config) => {
        logger.debug("Current proxy config:", JSON.stringify(config, null, 2));
      });
      maybeReload();
    }
  });

  logger.debug("=== APPLIED PROXY DEBUG ===");
  logger.debug("Proxy name:", selectedProxy.name);
  logger.debug("Proxy host:", selectedProxy.host);
  logger.debug("Proxy port:", selectedProxy.port);
  logger.debug("Proxy scheme:", scheme);
  logger.debug("Proxy username:", selectedProxy.username ? "SET" : "NOT SET");
  logger.debug("===========================");
}

/**
 * Apply direct mode (no proxy).
 * @param {Object} opts
 * @param {Object} opts.logger
 * @param {Function} opts.maybeReload
 */
export function applyDirect({ logger, maybeReload }) {
  logger.debug("No proxying active, setting direct mode.");
  chrome.proxy.settings.set(
    { value: { mode: "direct" }, scope: "regular" },
    () => {
      if (chrome.runtime.lastError) {
        logger.error("Direct mode error:", chrome.runtime.lastError.message);
      } else {
        logger.debug("Direct mode applied successfully.");
        maybeReload();
      }
    }
  );
}

/**
 * Main proxy settings application — reads storage, picks strategy, applies.
 * @param {Object} opts
 * @param {boolean} [opts.reloadActiveTab=false]
 * @param {Object} opts.logger
 * @param {Function} opts.reloadActiveTabIfAllowed
 */
export async function applyProxySettings({
  reloadActiveTab = false,
  logger,
  reloadActiveTabIfAllowed,
} = {}) {
  const maybeReload = () => {
    if (reloadActiveTab) {
      reloadActiveTabIfAllowed();
    }
  };

  const settings = await storage.getAllSettings();
  const globalProxyEnabled = !!settings[STORAGE_KEYS.globalProxyEnabled];
  const siteRules = settings[STORAGE_KEYS.siteRules] || {};
  const temporaryDirectSites = settings[STORAGE_KEYS.temporaryDirectSites] || {};
  let temporaryProxySites = settings[STORAGE_KEYS.temporaryProxySites] || {};
  const proxies = settings[STORAGE_KEYS.proxies] || [];
  const lastSelectedProxyName =
    settings[STORAGE_KEYS.lastSelectedProxy] || null;

  // Clean up legacy boolean entries in temporaryProxySites
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
      logger.warn("Clearing legacy temporary proxy sites without selected proxy");
      await storage.setTemporaryProxySites(cleanedTemporaryProxySites);
      temporaryProxySites = cleanedTemporaryProxySites;
    }
  }

  logger.debug("Applying proxy settings:", {
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
    logger.warn("Per-site proxy requested without selected proxy");
  }

  // 1. Per-site proxy only -> PAC (overrides global)
  if (hasOnlyProxyDomains) {
    logger.debug("Applying PAC script for per-site proxy only...");
    await applyPacMode({ logger, maybeReload });
    return;
  }

  // 2. Global proxy enabled -> fixed_servers
  if (globalProxyEnabled) {
    const selectedProxy = proxies.find((p) => p.name === lastSelectedProxyName);
    if (!selectedProxy) {
      logger.debug("No selected proxy for fixed_servers, setting direct.");
      applyDirect({ logger, maybeReload });
      return;
    }

    applyFixedServers({ selectedProxy, bypassList, logger, maybeReload });
    return;
  }

  // 3. No global proxy, but complex rules -> PAC
  if (hasComplexRulesRequiringPac) {
    logger.debug("Applying PAC script for complex rules (no global proxy)...");
    await applyPacMode({ logger, maybeReload });
    return;
  }

  // 4. Nothing active -> direct
  applyDirect({ logger, maybeReload });
}
