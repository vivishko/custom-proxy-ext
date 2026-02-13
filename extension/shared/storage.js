import { STORAGE_KEYS } from "../utils.js";

/**
 * Get all storage settings at once.
 * @returns {Promise<Object>}
 */
export async function getAllSettings() {
  return chrome.storage.sync.get(Object.values(STORAGE_KEYS));
}

/**
 * Get a single storage value by STORAGE_KEYS key name.
 * @param {string} key - One of STORAGE_KEYS values.
 * @returns {Promise<*>}
 */
export async function getOne(key) {
  const data = await chrome.storage.sync.get(key);
  return data[key];
}

/** @returns {Promise<Array>} */
export async function getProxies() {
  return (await getOne(STORAGE_KEYS.proxies)) || [];
}

/** @returns {Promise<Object>} */
export async function getSiteRules() {
  return (await getOne(STORAGE_KEYS.siteRules)) || {};
}

/** @returns {Promise<boolean>} */
export async function getGlobalProxyEnabled() {
  return !!(await getOne(STORAGE_KEYS.globalProxyEnabled));
}

/** @returns {Promise<string|null>} */
export async function getLastSelectedProxy() {
  return (await getOne(STORAGE_KEYS.lastSelectedProxy)) || null;
}

/** @returns {Promise<Object>} */
export async function getTemporaryDirectSites() {
  return (await getOne(STORAGE_KEYS.temporaryDirectSites)) || {};
}

/** @returns {Promise<Object>} */
export async function getTemporaryProxySites() {
  return (await getOne(STORAGE_KEYS.temporaryProxySites)) || {};
}

/** @returns {Promise<boolean>} */
export async function getLoggingEnabled() {
  return !!(await getOne(STORAGE_KEYS.loggingEnabled));
}

/**
 * Set one or more storage values. Keys must be STORAGE_KEYS values.
 * @param {Object} data - Object with STORAGE_KEYS-based keys.
 * @returns {Promise<void>}
 */
export async function setValues(data) {
  return chrome.storage.sync.set(data);
}

/** @param {Array} proxies */
export async function setProxies(proxies) {
  return setValues({ [STORAGE_KEYS.proxies]: proxies });
}

/** @param {Object} siteRules */
export async function setSiteRules(siteRules) {
  return setValues({ [STORAGE_KEYS.siteRules]: siteRules });
}

/** @param {boolean} enabled */
export async function setGlobalProxyEnabled(enabled) {
  return setValues({ [STORAGE_KEYS.globalProxyEnabled]: enabled });
}

/** @param {string} proxyName */
export async function setLastSelectedProxy(proxyName) {
  return setValues({ [STORAGE_KEYS.lastSelectedProxy]: proxyName });
}

/** @param {Object} sites */
export async function setTemporaryDirectSites(sites) {
  return setValues({ [STORAGE_KEYS.temporaryDirectSites]: sites });
}

/** @param {Object} sites */
export async function setTemporaryProxySites(sites) {
  return setValues({ [STORAGE_KEYS.temporaryProxySites]: sites });
}

/** @param {boolean} enabled */
export async function setLoggingEnabled(enabled) {
  return setValues({ [STORAGE_KEYS.loggingEnabled]: enabled });
}
