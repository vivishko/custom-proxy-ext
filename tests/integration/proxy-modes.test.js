import test from "node:test";
import assert from "node:assert/strict";

import { STORAGE_KEYS } from "../../extension/utils.js";
import { applyProxySettings } from "../../extension/background/proxy-modes.js";
import { createChromeMock } from "../helpers/chrome-mock.js";

function createLogger() {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}

test("applyProxySettings uses fixed_servers when global proxy is enabled", async () => {
  const { chrome, getCurrentProxyConfig } = createChromeMock({
    initialStorage: {
      [STORAGE_KEYS.proxies]: [
        {
          name: "proxy-main",
          host: "127.0.0.1",
          port: 8080,
          protocol: "http",
        },
      ],
      [STORAGE_KEYS.siteRules]: {},
      [STORAGE_KEYS.globalProxyEnabled]: true,
      [STORAGE_KEYS.lastSelectedProxy]: "proxy-main",
      [STORAGE_KEYS.temporaryDirectSites]: {},
      [STORAGE_KEYS.temporaryProxySites]: {},
      [STORAGE_KEYS.loggingEnabled]: false,
    },
  });

  globalThis.chrome = chrome;

  let reloadCount = 0;
  await applyProxySettings({
    reloadActiveTab: true,
    logger: createLogger(),
    reloadActiveTabIfAllowed: () => {
      reloadCount += 1;
    },
  });

  const config = getCurrentProxyConfig();
  assert.equal(config.value.mode, "fixed_servers");
  assert.equal(config.value.rules.proxyForHttp.host, "127.0.0.1");
  assert.equal(reloadCount, 1);
});

test("applyProxySettings uses PAC mode for per-site temporary proxy", async () => {
  const { chrome, getCurrentProxyConfig } = createChromeMock({
    initialStorage: {
      [STORAGE_KEYS.proxies]: [
        {
          name: "proxy-main",
          host: "127.0.0.1",
          port: 8080,
          protocol: "http",
        },
      ],
      [STORAGE_KEYS.siteRules]: {},
      [STORAGE_KEYS.globalProxyEnabled]: false,
      [STORAGE_KEYS.lastSelectedProxy]: "proxy-main",
      [STORAGE_KEYS.temporaryDirectSites]: {},
      [STORAGE_KEYS.temporaryProxySites]: { "example.com": "proxy-main" },
      [STORAGE_KEYS.loggingEnabled]: false,
    },
  });

  globalThis.chrome = chrome;

  await applyProxySettings({
    logger: createLogger(),
    reloadActiveTabIfAllowed: () => {},
  });

  const config = getCurrentProxyConfig();
  assert.equal(config.value.mode, "pac_script");
  assert.match(config.value.pacScript.data, /FindProxyForURL/);
});

test("applyProxySettings falls back to direct when selected proxy is missing", async () => {
  const { chrome, getCurrentProxyConfig } = createChromeMock({
    initialStorage: {
      [STORAGE_KEYS.proxies]: [],
      [STORAGE_KEYS.siteRules]: {},
      [STORAGE_KEYS.globalProxyEnabled]: true,
      [STORAGE_KEYS.lastSelectedProxy]: "missing-proxy",
      [STORAGE_KEYS.temporaryDirectSites]: {},
      [STORAGE_KEYS.temporaryProxySites]: {},
      [STORAGE_KEYS.loggingEnabled]: false,
    },
  });

  globalThis.chrome = chrome;

  await applyProxySettings({
    logger: createLogger(),
    reloadActiveTabIfAllowed: () => {},
  });

  const config = getCurrentProxyConfig();
  assert.equal(config.value.mode, "direct");
});
