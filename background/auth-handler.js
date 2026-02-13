import {
  STORAGE_KEYS,
  endsWithDomain,
  chooseDeterministicProxy,
} from "../utils.js";

/**
 * Register the onAuthRequired listener for proxy authentication.
 * @param {Object} logger - Logger instance with debug/error methods.
 */
export function registerAuthHandler(logger) {
  chrome.webRequest.onAuthRequired.addListener(
    (details, callbackFn) => {
      logger.debug("onAuthRequired listener activated.");
      logger.debug(
        "onAuthRequired triggered for",
        details.url,
        "isProxy:",
        details.isProxy,
        "challenger:",
        details.challenger
      );

      // Hardcoded bypass for jivosite.com WebSocket auth requests.
      // This prevents an auth loop for sites that use jivosite chat widget.
      if (
        details.url.startsWith("wss://") &&
        details.url.includes("jivosite.com")
      ) {
        logger.debug("Bypassing authentication for jivosite.com WebSocket.");
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

          logger.debug(
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
            logger.debug("Temporary direct, no auth");
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
                logger.debug("=== PROXY AUTH DEBUG ===");
                logger.debug("Selected proxy:", selectedProxy);
                logger.debug("Challenger:", challengerHost, challengerPort);
                logger.debug("Target host:", targetHost);
                logger.debug("=======================");
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
              logger.debug("Temporary proxy enabled but no proxy found");
            }
          }

          logger.debug(
            "Selected proxy for auth:",
            selectedProxy ? selectedProxy.name : "none"
          );

          if (selectedProxy && selectedProxy.username && selectedProxy.password) {
            logger.debug("Providing credentials for", selectedProxy.name);
            callbackFn({
              authCredentials: {
                username: selectedProxy.username,
                password: selectedProxy.password,
              },
            });
          } else {
            logger.debug("No credentials, letting Chrome prompt");
            callbackFn({});
          }
        } catch (error) {
          logger.error("Auth error:", error);
          callbackFn({});
        }
      })();
    },
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
  );
}
