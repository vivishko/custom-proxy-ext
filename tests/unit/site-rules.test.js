import test from "node:test";
import assert from "node:assert/strict";

import {
  createSiteRuleFromSetting,
  prepareSiteRulesForSave,
} from "../../extension/popup/site-rules.js";

test("createSiteRuleFromSetting maps special settings to type-only rule", () => {
  assert.deepEqual(createSiteRuleFromSetting("NO_PROXY"), { type: "NO_PROXY" });
  assert.deepEqual(createSiteRuleFromSetting("RANDOM_PROXY"), {
    type: "RANDOM_PROXY",
  });
  assert.deepEqual(createSiteRuleFromSetting("DIRECT_TEMPORARY"), {
    type: "DIRECT_TEMPORARY",
  });
});

test("createSiteRuleFromSetting maps proxy name to PROXY_BY_RULE", () => {
  assert.deepEqual(createSiteRuleFromSetting("proxy-us"), {
    type: "PROXY_BY_RULE",
    proxyName: "proxy-us",
  });
});

test("prepareSiteRulesForSave keeps rules unchanged for add without duplicate", () => {
  const input = {
    "example.com": { type: "NO_PROXY" },
  };

  assert.deepEqual(
    prepareSiteRulesForSave(input, {
      domain: "new.com",
      editingDomain: "",
      duplicateDomain: null,
    }),
    input
  );
});

test("prepareSiteRulesForSave removes edited domain key on domain rename", () => {
  const input = {
    "old.com": { type: "NO_PROXY" },
    "other.com": { type: "RANDOM_PROXY" },
  };

  assert.deepEqual(
    prepareSiteRulesForSave(input, {
      domain: "new.com",
      editingDomain: "old.com",
      duplicateDomain: null,
    }),
    {
      "other.com": { type: "RANDOM_PROXY" },
    }
  );
});

test("prepareSiteRulesForSave keeps target key and removes only old edited key", () => {
  const input = {
    "old.com": { type: "NO_PROXY" },
    "new.com": { type: "RANDOM_PROXY" },
    "keep.com": { type: "DIRECT_TEMPORARY" },
  };

  assert.deepEqual(
    prepareSiteRulesForSave(input, {
      domain: "new.com",
      editingDomain: "old.com",
      duplicateDomain: "new.com",
    }),
    {
      "new.com": { type: "RANDOM_PROXY" },
      "keep.com": { type: "DIRECT_TEMPORARY" },
    }
  );
});
