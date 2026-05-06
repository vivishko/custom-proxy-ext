import test from "node:test";
import assert from "node:assert/strict";

import {
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
