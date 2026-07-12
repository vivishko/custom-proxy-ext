import test from "node:test";
import assert from "node:assert/strict";

import {
  filterSiteRuleEntries,
  filterSiteRuleEntriesByType,
  getPageForItemIndex,
  getSiteRuleEntries,
  getSiteRulesPage,
  RULES_PAGE_SIZE,
  SITE_RULE_FILTERS,
  SITE_RULE_SORTS,
  sortSiteRuleEntries,
} from "../../extension/popup/site-rules.js";

function buildSiteRules(count) {
  const rules = {};
  for (let idx = 1; idx <= count; idx += 1) {
    rules[`site-${idx}.example.com`] = { type: "NO_PROXY" };
  }
  return rules;
}

test("getSiteRuleEntries returns empty list for invalid input", () => {
  assert.deepEqual(getSiteRuleEntries(null), []);
  assert.deepEqual(getSiteRuleEntries([]), []);
  assert.deepEqual(getSiteRuleEntries("invalid"), []);
});

test("getSiteRulesPage paginates rules with fixed page size", () => {
  const rules = buildSiteRules(25);
  const result = getSiteRulesPage(rules, 2, RULES_PAGE_SIZE);

  assert.equal(result.pagination.currentPage, 2);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pageEntries.length, 10);
  assert.equal(result.pageEntries[0][0], "site-11.example.com");
  assert.equal(result.pageEntries[9][0], "site-20.example.com");
});

test("filterSiteRuleEntries searches domain, rule type, and proxy name", () => {
  const entries = getSiteRuleEntries({
    "shop.example.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "news.example.com": { type: "RANDOM_PROXY" },
    "direct.example.com": { type: "NO_PROXY" },
  });

  assert.deepEqual(
    filterSiteRuleEntries(entries, "SHOP").map(([domain]) => domain),
    ["shop.example.com"]
  );
  assert.deepEqual(
    filterSiteRuleEntries(entries, "proxy-us").map(([domain]) => domain),
    ["shop.example.com"]
  );
  assert.deepEqual(
    filterSiteRuleEntries(entries, "random").map(([domain]) => domain),
    ["news.example.com"]
  );
});

test("getSiteRulesPage paginates filtered search results", () => {
  const rules = {
    "shop-1.example.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "shop-2.example.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "news.example.com": { type: "RANDOM_PROXY" },
  };
  const result = getSiteRulesPage(rules, 1, 1, "proxy-us");

  assert.equal(result.entries.length, 3);
  assert.equal(result.filteredEntries.length, 2);
  assert.equal(result.pagination.totalPages, 2);
  assert.deepEqual(result.pageEntries.map(([domain]) => domain), [
    "shop-1.example.com",
  ]);
});

test("filterSiteRuleEntriesByType filters rules by proxy usage and rule type", () => {
  const entries = getSiteRuleEntries({
    "shop.example.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "news.example.com": { type: "RANDOM_PROXY" },
    "direct.example.com": { type: "NO_PROXY" },
    "temp.example.com": { type: "DIRECT_TEMPORARY" },
  });

  assert.deepEqual(
    filterSiteRuleEntriesByType(entries, SITE_RULE_FILTERS.proxy).map(
      ([domain]) => domain
    ),
    ["shop.example.com"]
  );
  assert.deepEqual(
    filterSiteRuleEntriesByType(entries, SITE_RULE_FILTERS.noProxy).map(
      ([domain]) => domain
    ),
    ["direct.example.com"]
  );
  assert.deepEqual(
    filterSiteRuleEntriesByType(entries, SITE_RULE_FILTERS.randomProxy).map(
      ([domain]) => domain
    ),
    ["news.example.com"]
  );
  assert.deepEqual(
    filterSiteRuleEntriesByType(
      entries,
      SITE_RULE_FILTERS.directTemporary
    ).map(([domain]) => domain),
    ["temp.example.com"]
  );
});

test("sortSiteRuleEntries sorts by recency and domain", () => {
  const entries = getSiteRuleEntries({
    "zeta.example.com": { type: "NO_PROXY" },
    "Alpha.example.com": { type: "NO_PROXY" },
    "middle.example.com": { type: "NO_PROXY" },
  });

  assert.deepEqual(
    sortSiteRuleEntries(entries, SITE_RULE_SORTS.recentFirst).map(
      ([domain]) => domain
    ),
    ["middle.example.com", "Alpha.example.com", "zeta.example.com"]
  );
  assert.deepEqual(
    sortSiteRuleEntries(entries, SITE_RULE_SORTS.domainAsc).map(
      ([domain]) => domain
    ),
    ["Alpha.example.com", "middle.example.com", "zeta.example.com"]
  );
  assert.deepEqual(
    sortSiteRuleEntries(entries, SITE_RULE_SORTS.domainDesc).map(
      ([domain]) => domain
    ),
    ["zeta.example.com", "middle.example.com", "Alpha.example.com"]
  );
});

test("getSiteRulesPage combines search, filter, sort, and pagination", () => {
  const rules = {
    "zeta-shop.example.com": { type: "PROXY_BY_RULE", proxyName: "proxy-us" },
    "alpha-shop.example.com": { type: "PROXY_BY_RULE", proxyName: "proxy-eu" },
    "news.example.com": { type: "RANDOM_PROXY" },
  };
  const result = getSiteRulesPage(
    rules,
    1,
    1,
    "shop",
    SITE_RULE_FILTERS.proxy,
    SITE_RULE_SORTS.domainAsc
  );

  assert.equal(result.entries.length, 3);
  assert.equal(result.searchedEntries.length, 2);
  assert.equal(result.filteredEntries.length, 2);
  assert.equal(result.sortedEntries.length, 2);
  assert.equal(result.pagination.totalPages, 2);
  assert.deepEqual(result.pageEntries.map(([domain]) => domain), [
    "alpha-shop.example.com",
  ]);
});

test("getSiteRulesPage clamps page after data shrink (delete edge case)", () => {
  const rules = buildSiteRules(20);
  const result = getSiteRulesPage(rules, 3, RULES_PAGE_SIZE);

  assert.equal(result.pagination.totalPages, 2);
  assert.equal(result.pagination.currentPage, 2);
  assert.equal(result.pageEntries.length, 10);
  assert.equal(result.pageEntries[0][0], "site-11.example.com");
});

test("getPageForItemIndex resolves target page for new item", () => {
  assert.equal(getPageForItemIndex(-1, RULES_PAGE_SIZE), 1);
  assert.equal(getPageForItemIndex(0, RULES_PAGE_SIZE), 1);
  assert.equal(getPageForItemIndex(9, RULES_PAGE_SIZE), 1);
  assert.equal(getPageForItemIndex(10, RULES_PAGE_SIZE), 2);
  assert.equal(getPageForItemIndex(25, RULES_PAGE_SIZE), 3);
});
