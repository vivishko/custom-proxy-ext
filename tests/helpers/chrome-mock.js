export function createChromeMock({ initialStorage = {} } = {}) {
  const storage = { ...initialStorage };
  let currentProxyConfig = null;

  const listeners = {
    tabsOnUpdated: [],
    tabsOnRemoved: [],
  };

  const chrome = {
    runtime: {
      lastError: null,
    },
    storage: {
      sync: {
        async get(keys) {
          if (Array.isArray(keys)) {
            const result = {};
            for (const key of keys) {
              if (Object.prototype.hasOwnProperty.call(storage, key)) {
                result[key] = storage[key];
              }
            }
            return result;
          }

          if (typeof keys === "string") {
            if (Object.prototype.hasOwnProperty.call(storage, keys)) {
              return { [keys]: storage[keys] };
            }
            return {};
          }

          return { ...storage };
        },
        async set(data) {
          Object.assign(storage, data);
        },
      },
    },
    proxy: {
      settings: {
        set(config, callback) {
          currentProxyConfig = config;
          chrome.runtime.lastError = null;
          if (callback) callback();
        },
        get(_options, callback) {
          if (callback) callback(currentProxyConfig || {});
        },
      },
    },
    tabs: {
      onUpdated: {
        addListener(fn) {
          listeners.tabsOnUpdated.push(fn);
        },
      },
      onRemoved: {
        addListener(fn) {
          listeners.tabsOnRemoved.push(fn);
        },
      },
    },
  };

  return {
    chrome,
    listeners,
    getStorageSnapshot() {
      return { ...storage };
    },
    getCurrentProxyConfig() {
      return currentProxyConfig;
    },
  };
}
