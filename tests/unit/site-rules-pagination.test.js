import test from "node:test";
import assert from "node:assert/strict";

import {
  filterSiteRuleEntries,
  getPageForItemIndex,
  getSiteRuleEntries,
  getSiteRulesPage,
  RULES_PAGE_SIZE,
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
