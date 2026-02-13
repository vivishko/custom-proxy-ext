import { STORAGE_KEYS } from "../utils.js";

/**
 * Build PAC script text from current storage settings.
 *
 * NOTE: The PAC script runs in a sandboxed environment and cannot import
 * external modules. Functions like `endsWithDomain` and `chooseRandomProxy`
 * are duplicated inside the PAC string intentionally. If you change the
 * domain-matching or proxy-selection logic in utils.js, you MUST also update
 * the corresponding functions inside this PAC template to avoid logic drift.
 *
 * @param {Object} logger - Logger instance with debug/error methods.
 * @returns {Promise<string>} PAC script as a string.
 */
export async function buildPacScript(logger) {
  try {
    logger.debug("Building PAC script...");
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const proxies = settings.proxies || [];
    const siteRules = settings.siteRules || {};
    const globalProxyEnabled = !!settings.globalProxyEnabled;
    const lastSelectedProxyName = settings.lastSelectedProxy || null;
    const temporaryDirectSites = settings.temporaryDirectSites || {};
    const temporaryProxySites = settings.temporaryProxySites || {};

    logger.debug("Storage data:", {
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

// WARNING: This endsWithDomain is duplicated from utils.js because the PAC
// sandbox cannot import external modules. Keep in sync with utils.js version.
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
    logger.debug("Generated PAC script length:", pac.length);
    logger.debug("PAC preview:", pac.substring(0, 300) + "...");
    return pac;
  } catch (error) {
    logger.error("Error building PAC script:", error);
    return `function FindProxyForURL(url, host) { return "DIRECT"; }`;
  }
}
