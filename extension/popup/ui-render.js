import { TIMEOUTS } from "../utils.js";
import { findMostSpecificRule } from "../utils.js";
import { DEFAULT_LOCALE, STRINGS, formatString } from "../strings.js";
import * as storage from "../shared/storage.js";

const strings = STRINGS[DEFAULT_LOCALE];

/**
 * Resolve a temporary proxy name from storage value + fallback.
 * @param {*} value - Stored value (string proxy name, boolean true, or falsy).
 * @param {string|null} fallback - Fallback proxy name (lastSelectedProxy).
 * @returns {string|null}
 */
export function resolveTemporaryProxyName(value, fallback) {
  if (typeof value === "string" && value.trim()) return value;
  if (value === true && fallback) return fallback;
  return null;
}

/**
 * Build proxy <option> elements for a <select> that shows main proxy list.
 * Used by both global and page selects.
 * @param {Array} proxies - Array of proxy objects.
 * @returns {DocumentFragment}
 */
export function buildProxyOptions(proxies) {
  const fragment = document.createDocumentFragment();
  proxies.forEach((proxy) => {
    const option = document.createElement("option");
    option.value = proxy.name;
    option.textContent = `${proxy.name} (${proxy.country})`;
    fragment.appendChild(option);
  });
  return fragment;
}

/**
 * Build proxy <option> elements for site-rule selects (includes special types).
 * @param {Array} proxies - Array of proxy objects.
 * @returns {DocumentFragment}
 */
export function buildRuleProxyOptions(proxies) {
  const fragment = document.createDocumentFragment();

  const specialOptions = [
    { value: "NO_PROXY", text: "NO_PROXY" },
    { value: "RANDOM_PROXY", text: "RANDOM_PROXY" },
    { value: "DIRECT_TEMPORARY", text: "DIRECT (Temporary)" },
  ];

  specialOptions.forEach(({ value, text }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    fragment.appendChild(option);
  });

  proxies.forEach((proxy) => {
    const option = document.createElement("option");
    option.value = proxy.name;
    option.textContent = proxy.name;
    fragment.appendChild(option);
  });

  return fragment;
}

/**
 * Set text content of the mode hint element.
 * @param {HTMLElement} hintEl
 * @param {string} message
 */
export function setModeHint(hintEl, message = "") {
  hintEl.textContent = message;
}

/**
 * Show a temporary hint message that auto-clears.
 * @param {HTMLElement} hintEl
 * @param {string} message
 */
export function showModeInteractionHint(hintEl, message) {
  setModeHint(hintEl, message);
  window.setTimeout(() => {
    if (hintEl.textContent === message) {
      setModeHint(hintEl, "");
    }
  }, TIMEOUTS.hintDuration);
}

/**
 * Update the proxy status display text based on current settings.
 * @param {Object} opts
 * @param {HTMLElement} opts.statusEl - The status display element.
 * @param {HTMLElement} opts.pageProxyToggle - Page proxy toggle checkbox.
 * @param {string} opts.currentTabDomain
 */
export async function updateProxyStatusDisplay({ statusEl, pageProxyToggle, currentTabDomain }) {
  if (!currentTabDomain) {
    statusEl.textContent = strings.status.noDomain;
    return;
  }

  const settings = await storage.getAllSettings();
  const globalProxyEnabled = settings.globalProxyEnabled || false;
  const lastSelectedProxyName = settings.lastSelectedProxy || null;
  const siteRules = settings.siteRules || {};
  const temporaryDirectSites = settings.temporaryDirectSites || {};
  const temporaryProxySites = settings.temporaryProxySites || {};
  const currentDomainProxyName = resolveTemporaryProxyName(
    temporaryProxySites[currentTabDomain],
    lastSelectedProxyName
  );
  const activeTemporaryDomains = Object.keys(temporaryProxySites).filter(
    (domain) =>
      resolveTemporaryProxyName(
        temporaryProxySites[domain],
        lastSelectedProxyName
      )
  );

  const { rule, matchedDomain } = findMostSpecificRule(
    currentTabDomain,
    siteRules
  );

  if (rule) {
    let statusMsg = strings.status.direct;
    const displayDomain = matchedDomain || currentTabDomain;

    if (rule.type === "NO_PROXY") {
      statusMsg = formatString(strings.status.ruleNoProxy, {
        domain: displayDomain,
      });
    } else if (rule.type === "RANDOM_PROXY") {
      statusMsg = formatString(strings.status.ruleRandom, {
        domain: displayDomain,
      });
    } else if (rule.type === "PROXY_BY_RULE" && rule.proxyName) {
      statusMsg = formatString(strings.status.ruleProxy, {
        proxyName: rule.proxyName,
        domain: displayDomain,
      });
    } else if (rule.type === "DIRECT_TEMPORARY") {
      statusMsg = formatString(strings.status.ruleDirectTemporary, {
        domain: displayDomain,
      });
    }

    statusEl.textContent = statusMsg;
    return;
  }

  if (temporaryDirectSites[currentTabDomain]) {
    statusEl.textContent = strings.status.direct;
    return;
  }

  if (currentDomainProxyName) {
    statusEl.textContent = formatString(strings.status.onlyThisPage, {
      proxyName: currentDomainProxyName,
      domain: currentTabDomain,
    });
    return;
  }

  if (globalProxyEnabled && lastSelectedProxyName) {
    statusEl.textContent = formatString(strings.status.global, {
      proxyName: lastSelectedProxyName,
    });
    return;
  }

  statusEl.textContent = strings.status.direct;
  if (activeTemporaryDomains.length > 0) {
    pageProxyToggle.checked = false;
  }
}
