import { TIMEOUTS } from "../utils.js";
import * as storage from "../shared/storage.js";

/**
 * Track tab domains and clean up temporary proxy sites when tabs close.
 * @param {Object} opts
 * @param {Object} opts.logger - Logger instance.
 * @param {Function} opts.applyProxySettings - Callback to re-apply proxy settings.
 * @param {Function} opts.checkCurrentProxySettings - Callback to log current settings.
 */
export function initTabTracker({ logger, applyProxySettings, checkCurrentProxySettings }) {
  const tabDomainById = new Map();

  const rememberTabDomain = (tabId, url) => {
    if (!url) return;
    try {
      const hostname = new URL(url).hostname;
      if (hostname) tabDomainById.set(tabId, hostname);
    } catch (error) {
      logger.debug("Failed to parse tab URL", url, error);
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
    (async () => {
      const temporaryProxySites = await storage.getTemporaryProxySites();
      if (!temporaryProxySites[domain]) return;
      delete temporaryProxySites[domain];
      await storage.setTemporaryProxySites(temporaryProxySites);
      applyProxySettings();
      setTimeout(checkCurrentProxySettings, TIMEOUTS.proxyCheckDelay);
    })();
  });
}
