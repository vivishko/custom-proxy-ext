import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProxyDeleteWarningMessage,
  buildProxyDeletionState,
  getLastSelectedProxyAfterDeletion,
  getDependentRuleDomains,
} from "../../extension/popup/proxy-crud.js";

test("getDependentRuleDomains returns domains linked to deleted proxy", () => {
  const siteRules = {
    "alpha.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "beta.com": { type: "NO_PROXY" },
    "gamma.com": { type: "PROXY_BY_RULE", proxyName: "proxy-de" },
    "delta.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
  };

  assert.deepEqual(getDependentRuleDomains(siteRules, "proxy-us"), [
    "alpha.com",
    "delta.com",
  ]);
});

test("getDependentRuleDomains ignores invalid and legacy rule shapes", () => {
  const siteRules = {
    "null-rule.com": null,
    "string-rule.com": "PROXY_BY_RULE",
    "missing-proxy-name.com": { type: "PROXY_BY_RULE" },
    "valid.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
  };

  assert.deepEqual(getDependentRuleDomains(siteRules, "proxy-us"), ["valid.com"]);
});

test("buildProxyDeletionState converts dependent rules to NO_PROXY and cleans temporary mappings", () => {
  const state = buildProxyDeletionState({
    proxies: [
      { name: "proxy-us", host: "1.1.1.1", port: 80, country: "US" },
      { name: "proxy-de", host: "2.2.2.2", port: 81, country: "DE" },
    ],
    siteRules: {
      "alpha.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
      "beta.com": { type: "NO_PROXY" },
      "delta.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    },
    temporaryProxySites: {
      "alpha.com": "proxy-us",
      "other.com": "proxy-de",
    },
    proxyName: "proxy-us",
  });

  assert.deepEqual(state.updatedProxies, [
    { name: "proxy-de", host: "2.2.2.2", port: 81, country: "DE" },
  ]);
  assert.deepEqual(state.updatedSiteRules, {
    "alpha.com": { type: "NO_PROXY" },
    "beta.com": { type: "NO_PROXY" },
    "delta.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(state.updatedTemporaryProxySites, {
    "other.com": "proxy-de",
  });
  assert.equal(state.rulesUpdatedCount, 2);
  assert.equal(state.temporaryUpdated, true);
});

test("buildProxyDeletionState keeps rules unchanged when no dependencies", () => {
  const state = buildProxyDeletionState({
    proxies: [{ name: "proxy-us", host: "1.1.1.1", port: 80, country: "US" }],
    siteRules: {
      "alpha.com": { type: "RANDOM_PROXY" },
      "beta.com": { type: "NO_PROXY" },
    },
    temporaryProxySites: {
      "other.com": "proxy-de",
    },
    proxyName: "proxy-us",
  });

  assert.deepEqual(state.updatedProxies, []);
  assert.deepEqual(state.updatedSiteRules, {
    "alpha.com": { type: "RANDOM_PROXY" },
    "beta.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(state.updatedTemporaryProxySites, {
    "other.com": "proxy-de",
  });
  assert.equal(state.rulesUpdatedCount, 0);
  assert.equal(state.temporaryUpdated, false);
});

test("buildProxyDeletionState tolerates invalid siteRules entries", () => {
  const state = buildProxyDeletionState({
    proxies: [{ name: "proxy-us", host: "1.1.1.1", port: 80, country: "US" }],
    siteRules: {
      "null-rule.com": null,
      "string-rule.com": "PROXY_BY_RULE",
      "missing-proxy-name.com": { type: "PROXY_BY_RULE" },
      "valid.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    },
    temporaryProxySites: {},
    proxyName: "proxy-us",
  });

  assert.deepEqual(state.updatedProxies, []);
  assert.deepEqual(state.updatedSiteRules, {
    "null-rule.com": null,
    "string-rule.com": "PROXY_BY_RULE",
    "missing-proxy-name.com": { type: "PROXY_BY_RULE" },
    "valid.com": { type: "NO_PROXY" },
  });
  assert.equal(state.rulesUpdatedCount, 1);
});

test("buildProxyDeletionState removes all proxies with the same name", () => {
  const state = buildProxyDeletionState({
    proxies: [
      { name: "proxy-us", host: "1.1.1.1", port: 80, country: "US" },
      { name: "proxy-us", host: "2.2.2.2", port: 81, country: "US" },
      { name: "proxy-de", host: "3.3.3.3", port: 82, country: "DE" },
    ],
    siteRules: {},
    temporaryProxySites: {},
    proxyName: "proxy-us",
  });

  assert.deepEqual(state.updatedProxies, [
    { name: "proxy-de", host: "3.3.3.3", port: 82, country: "DE" },
  ]);
});

test("buildProxyDeletionState leaves non-string temporary mappings untouched", () => {
  const state = buildProxyDeletionState({
    proxies: [{ name: "proxy-us", host: "1.1.1.1", port: 80, country: "US" }],
    siteRules: {},
    temporaryProxySites: {
      "bool.com": true,
      "null.com": null,
      "num.com": 1,
      "match.com": "proxy-us",
    },
    proxyName: "proxy-us",
  });

  assert.deepEqual(state.updatedTemporaryProxySites, {
    "bool.com": true,
    "null.com": null,
    "num.com": 1,
  });
  assert.equal(state.temporaryUpdated, true);
});

test("buildProxyDeleteWarningMessage includes consequences with dependent rules", () => {
  const message = buildProxyDeleteWarningMessage("proxy-us", [
    "a.com",
    "b.com",
  ]);

  assert.match(message, /used by 2 site rule\(s\)/);
  assert.match(message, /a\.com, b\.com/);
  assert.match(message, /switched to NO_PROXY/);
});

test("buildProxyDeleteWarningMessage is concise without dependent rules", () => {
  const message = buildProxyDeleteWarningMessage("proxy-us", []);

  assert.match(message, /Delete proxy "proxy-us"\?/);
  assert.doesNotMatch(message, /used by/);
  assert.match(message, /Temporary per-page proxy bindings/);
});

test("buildProxyDeleteWarningMessage handles non-array dependentDomains", () => {
  const message = buildProxyDeleteWarningMessage("proxy-us", null);

  assert.match(message, /Delete proxy "proxy-us"\?/);
  assert.doesNotMatch(message, /used by/);
});

test("buildProxyDeleteWarningMessage truncates long domains preview", () => {
  const message = buildProxyDeleteWarningMessage("proxy-us", [
    "a.com",
    "b.com",
    "c.com",
    "d.com",
    "e.com",
    "f.com",
  ]);

  assert.match(message, /a\.com, b\.com, c\.com, d\.com, e\.com \(\+1 more\)/);
});

test("getLastSelectedProxyAfterDeletion falls back to last remaining proxy", () => {
  const next = getLastSelectedProxyAfterDeletion({
    lastSelectedProxy: "proxy-us",
    deletedProxyName: "proxy-us",
    updatedProxies: [
      { name: "proxy-fr" },
      { name: "proxy-de" },
    ],
  });

  assert.equal(next, "proxy-de");
});

test("getLastSelectedProxyAfterDeletion keeps value when another proxy was deleted", () => {
  const next = getLastSelectedProxyAfterDeletion({
    lastSelectedProxy: "proxy-fr",
    deletedProxyName: "proxy-us",
    updatedProxies: [{ name: "proxy-fr" }],
  });

  assert.equal(next, "proxy-fr");
});

test("getLastSelectedProxyAfterDeletion keeps null when nothing was selected", () => {
  const next = getLastSelectedProxyAfterDeletion({
    lastSelectedProxy: null,
    deletedProxyName: "proxy-us",
    updatedProxies: [{ name: "proxy-fr" }],
  });

  assert.equal(next, null);
});

test("getLastSelectedProxyAfterDeletion returns null for malformed fallback proxy", () => {
  const next = getLastSelectedProxyAfterDeletion({
    lastSelectedProxy: "proxy-us",
    deletedProxyName: "proxy-us",
    updatedProxies: [{ host: "1.1.1.1" }],
  });

  assert.equal(next, null);
});

test("getDependentRuleDomains preserves deterministic key iteration order", () => {
  const siteRules = {
    "b.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "a.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "c.com": { type: "NO_PROXY" },
  };

  assert.deepEqual(getDependentRuleDomains(siteRules, "proxy-us"), [
    "b.com",
    "a.com",
  ]);
});
