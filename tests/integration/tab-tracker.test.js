import test from "node:test";
import assert from "node:assert/strict";

import { STORAGE_KEYS } from "../../extension/utils.js";
import { initTabTracker } from "../../extension/background/tab-tracker.js";
import { createChromeMock } from "../helpers/chrome-mock.js";

function createLogger() {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}

test("tab-tracker removes temporary proxy mapping when tracked tab is closed", async () => {
  const { chrome, listeners, getStorageSnapshot } = createChromeMock({
    initialStorage: {
      [STORAGE_KEYS.temporaryProxySites]: { "example.com": "proxy-main" },
    },
  });

  globalThis.chrome = chrome;

  let applyCalls = 0;
  let checkCalls = 0;

  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 0;
  };

  try {
    initTabTracker({
      logger: createLogger(),
      applyProxySettings: () => {
        applyCalls += 1;
      },
      checkCurrentProxySettings: () => {
        checkCalls += 1;
      },
    });

    listeners.tabsOnUpdated[0](123, {}, { url: "https://example.com/path" });
    listeners.tabsOnRemoved[0](123);

    for (let i = 0; i < 20 && applyCalls === 0; i++) {
      await new Promise((resolve) => globalThis.queueMicrotask(resolve));
    }

    const snapshot = getStorageSnapshot();
    assert.deepEqual(snapshot[STORAGE_KEYS.temporaryProxySites], {});
    assert.equal(applyCalls, 1);
    assert.equal(checkCalls, 1);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});
