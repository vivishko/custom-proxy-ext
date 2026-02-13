// utils.js

export const TIMEOUTS = {
  proxyCheckDelay: 1000,
  debounceApply: 100,
  tabRetryInterval: 100,
  tabMaxAttempts: 10,
  hintDuration: 2200,
  feedbackDuration: 2200,
};

export const STORAGE_KEYS = {
  proxies: "proxies",
  siteRules: "siteRules",
  globalProxyEnabled: "globalProxyEnabled",
  lastSelectedProxy: "lastSelectedProxy",
  temporaryDirectSites: "temporaryDirectSites",
  temporaryProxySites: "temporaryProxySites",
  loggingEnabled: "loggingEnabled",
};

/**
 * Lightweight console logger with on/off switch.
 * When disabled, methods are no-ops.
 */
export function createLogger(initiallyEnabled = false) {
  let enabled = !!initiallyEnabled;

  const prefix = () => `[ProxyExt]`;

  // Wrapper that checks enabled flag on each call
  const wrap = (fn) => {
    return (...args) => {
      if (!enabled) return;
      try {
        fn(...args);
      } catch (e) {
        // Swallow logging errors to avoid breaking extension logic
      }
    };
  };

  return {
    setEnabled(next) {
      enabled = !!next;
    },
    isEnabled() {
      return enabled;
    },
    debug: wrap((...args) => console.log(prefix(), ...args)),
    info: wrap((...args) => console.info(prefix(), ...args)),
    warn: wrap((...args) => console.warn(prefix(), ...args)),
    error: wrap((...args) => console.error(prefix(), ...args)),
  };
}

/**
 * Return most specific rule and the domain that matched.
 */
export function findMostSpecificRule(hostname, rulesObj) {
  if (!hostname || !rulesObj) return { rule: null, matchedDomain: null };
  let matchedDomain = null;
  let rule = null;
  for (const d in rulesObj) {
    if (!Object.prototype.hasOwnProperty.call(rulesObj, d)) continue;
    if (endsWithDomain(hostname, d)) {
      if (!matchedDomain || d.length > matchedDomain.length) {
        matchedDomain = d;
        rule = rulesObj[d];
      }
    }
  }
  return { rule, matchedDomain };
}

/**
 * Check if host ends with domain boundary-aware (foo.bar matches bar, but not foobar).
 */
export function endsWithDomain(host, domain) {
  if (!host || !domain) return false;
  if (host === domain) return true;
  return host.length > domain.length && host.endsWith("." + domain);
}

/**
 * Deterministically choose a proxy from list based on hostname (stable per host).
 */
export function chooseDeterministicProxy(hostname, proxies) {
  if (!Array.isArray(proxies) || proxies.length === 0) return null;
  let sum = 0;
  const h = String(hostname || "");
  for (let i = 0; i < h.length; i++) {
    sum = (sum * 31 + h.charCodeAt(i)) >>> 0;
  }
  const idx = sum % proxies.length;
  return proxies[idx];
}
