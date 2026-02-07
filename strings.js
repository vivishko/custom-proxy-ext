export const DEFAULT_LOCALE = "en";

export const STRINGS = {
  en: {
    toggles: {
      global: "Global proxy",
      onlyThisPage: "Only this page",
    },
    status: {
      noDomain: "This extension works only on pages with a domain.",
      direct: "Proxy: DIRECT (no proxy enabled)",
      global: "Proxy: {proxyName} (all sites)",
      onlyThisPage: "Proxy: {proxyName} (only for {domain})",
      ruleNoProxy: "Proxy: DIRECT (rule for {domain})",
      ruleRandom: "Proxy: RANDOM (rule for {domain})",
      ruleProxy: "Proxy: {proxyName} (rule for {domain})",
      ruleDirectTemporary: "Proxy: DIRECT (temporary rule for {domain})",
    },
    hints: {
      noProxies: "Add a proxy to enable this toggle.",
      onlyThisPageInfo:
        "Only this page applies only to this domain; Global still applies elsewhere.",
      noDomain: "This extension works only on pages with a domain.",
      noProxiesAvailable: "No proxies available",
    },
  },
};

export function formatString(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    return `{${key}}`;
  });
}
