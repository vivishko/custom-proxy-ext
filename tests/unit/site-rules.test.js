import test from "node:test";
import assert from "node:assert/strict";

import {
  createSiteRuleFromSetting,
  findImportSiteRuleConflicts,
  IMPORT_DUPLICATE_STRATEGIES,
  mergeImportedSiteRules,
  normalizeImportedSiteRule,
  normalizeSiteRuleDomain,
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

test("normalizeSiteRuleDomain trims and lowercases domain", () => {
  assert.equal(normalizeSiteRuleDomain("  Amazon.COM "), "amazon.com");
  assert.equal(normalizeSiteRuleDomain(""), "");
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

test("findImportSiteRuleConflicts detects case-insensitive conflicts with existing rules", () => {
  const existingRules = {
    "Example.com": { type: "NO_PROXY" },
    "keep.com": { type: "RANDOM_PROXY" },
  };
  const importedRules = {
    "example.com": { type: "DIRECT_TEMPORARY" },
    "new.com": { type: "NO_PROXY" },
  };

  assert.deepEqual(findImportSiteRuleConflicts(existingRules, importedRules), [
    {
      importedDomain: "example.com",
      existingDomain: "Example.com",
    },
  ]);
});

test("normalizeImportedSiteRule accepts only current object format", () => {
  assert.deepEqual(normalizeImportedSiteRule("NO_PROXY"), null);
  assert.deepEqual(normalizeImportedSiteRule("proxy-us"), null);
  assert.deepEqual(normalizeImportedSiteRule({ proxyName: "proxy-eu" }), null);
  assert.equal(normalizeImportedSiteRule("   "), null);
  assert.equal(normalizeImportedSiteRule({ type: "UNKNOWN" }), null);
  assert.deepEqual(normalizeImportedSiteRule({ type: "NO_PROXY" }), {
    type: "NO_PROXY",
  });
  assert.deepEqual(
    normalizeImportedSiteRule({
      type: "PROXY_BY_RULE",
      proxyName: "proxy-us",
    }),
    { type: "PROXY_BY_RULE", proxyName: "proxy-us" }
  );
});

test("mergeImportedSiteRules replaces duplicates by default", () => {
  const existingRules = {
    "Example.com": { type: "NO_PROXY" },
    "keep.com": { type: "RANDOM_PROXY" },
  };
  const importedRules = {
    "example.com": { type: "DIRECT_TEMPORARY" },
    "new.com": { type: "NO_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "keep.com": { type: "RANDOM_PROXY" },
    "example.com": { type: "DIRECT_TEMPORARY" },
    "new.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 2,
    added: 1,
    replaced: 1,
    skipped: 0,
    duplicates: 1,
    skippedMissingProxy: 0,
    skippedInvalid: 0,
  });
});

test("mergeImportedSiteRules skips duplicate imports when strategy is skip", () => {
  const existingRules = {
    "Example.com": { type: "NO_PROXY" },
    "keep.com": { type: "RANDOM_PROXY" },
  };
  const importedRules = {
    "example.com": { type: "DIRECT_TEMPORARY" },
    "new.com": { type: "NO_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.skip,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "Example.com": { type: "NO_PROXY" },
    "keep.com": { type: "RANDOM_PROXY" },
    "new.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 2,
    added: 1,
    replaced: 0,
    skipped: 1,
    duplicates: 1,
    skippedMissingProxy: 0,
    skippedInvalid: 0,
  });
});

test("mergeImportedSiteRules treats exact-key existing domain as duplicate and replaces", () => {
  const existingRules = {
    "example.com": { type: "NO_PROXY" },
  };
  const importedRules = {
    "example.com": { type: "RANDOM_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "example.com": { type: "RANDOM_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 1,
    added: 0,
    replaced: 1,
    skipped: 0,
    duplicates: 1,
    skippedMissingProxy: 0,
    skippedInvalid: 0,
  });
});

test("mergeImportedSiteRules lowercases imported domain keys", () => {
  const existingRules = {};
  const importedRules = {
    "  Amazon.COM  ": { type: "NO_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "amazon.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 1,
    added: 1,
    replaced: 0,
    skipped: 0,
    duplicates: 0,
    skippedMissingProxy: 0,
    skippedInvalid: 0,
  });
});

test("mergeImportedSiteRules replaces mixed-case existing key with lowercase key", () => {
  const existingRules = {
    "Amazon.COM": { type: "RANDOM_PROXY" },
  };
  const importedRules = {
    "amazon.com": { type: "NO_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "amazon.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 1,
    added: 0,
    replaced: 1,
    skipped: 0,
    duplicates: 1,
    skippedMissingProxy: 0,
    skippedInvalid: 0,
  });
});

test("mergeImportedSiteRules skips PROXY_BY_RULE entries with missing proxies", () => {
  const existingRules = {
    "keep.com": { type: "NO_PROXY" },
  };
  const importedRules = {
    "missing-proxy.com": { type: "PROXY_BY_RULE", proxyName: "proxy-missing" },
    "ok-proxy.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "special.com": { type: "RANDOM_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "keep.com": { type: "NO_PROXY" },
    "ok-proxy.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "special.com": { type: "RANDOM_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 3,
    added: 2,
    replaced: 0,
    skipped: 1,
    duplicates: 0,
    skippedMissingProxy: 1,
    skippedInvalid: 0,
  });
});

test("mergeImportedSiteRules treats string rules as invalid format", () => {
  const existingRules = {};
  const importedRules = {
    "legacy-missing.com": "proxy-missing",
    "legacy-special.com": "NO_PROXY",
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {});
  assert.deepEqual(stats, {
    totalImported: 2,
    added: 0,
    replaced: 0,
    skipped: 2,
    duplicates: 0,
    skippedMissingProxy: 0,
    skippedInvalid: 2,
  });
});

test("mergeImportedSiteRules skips invalid rule format entries", () => {
  const existingRules = {};
  const importedRules = {
    "invalid.com": { type: "UNKNOWN_TYPE" },
    "valid.com": { type: "NO_PROXY" },
  };

  const { mergedRules, stats } = mergeImportedSiteRules(
    existingRules,
    importedRules,
    IMPORT_DUPLICATE_STRATEGIES.replace,
    ["proxy-us"]
  );

  assert.deepEqual(mergedRules, {
    "valid.com": { type: "NO_PROXY" },
  });
  assert.deepEqual(stats, {
    totalImported: 2,
    added: 1,
    replaced: 0,
    skipped: 1,
    duplicates: 0,
    skippedMissingProxy: 0,
    skippedInvalid: 1,
  });
});
