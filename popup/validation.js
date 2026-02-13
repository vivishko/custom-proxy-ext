/**
 * Validate a new proxy object.
 * Returns null if valid, or an error message string if invalid.
 * @param {Object} proxy - { name, host, port, country, ... }
 * @param {Array} existingProxies - Current proxy list (to check name uniqueness).
 * @returns {string|null}
 */
export function validateProxy(proxy, existingProxies) {
  if (!proxy.name || !proxy.host || !proxy.port || !proxy.country) {
    return "Please fill in all required proxy fields (Name, Host, Port, Country).";
  }

  if (isNaN(proxy.port) || proxy.port < 1 || proxy.port > 65535) {
    return "Please enter a valid port number (1-65535).";
  }

  if (existingProxies.some((p) => p.name === proxy.name)) {
    return "A proxy with this name already exists. Please choose a different name.";
  }

  return null;
}

/**
 * Validate imported proxies array.
 * Returns null if valid, or an error message string if invalid.
 * @param {*} data - Parsed JSON data.
 * @returns {string|null}
 */
export function validateImportedProxies(data) {
  if (!Array.isArray(data)) {
    return "Invalid proxies file format.";
  }

  const seenNames = new Set();
  for (const p of data) {
    if (!p || !p.name || !p.host || !p.port || !p.country) {
      return "Invalid proxies file format.";
    }
    if (seenNames.has(p.name)) {
      return `Duplicate proxy name in import: ${p.name}`;
    }
    seenNames.add(p.name);
  }

  return null;
}

/**
 * Validate imported site rules object.
 * Returns null if valid, or an error message string if invalid.
 * @param {*} data - Parsed JSON data.
 * @returns {string|null}
 */
export function validateImportedSiteRules(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Invalid site rules file format.";
  }

  return null;
}
