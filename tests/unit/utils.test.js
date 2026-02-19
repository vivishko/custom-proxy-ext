import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseDeterministicProxy,
  endsWithDomain,
  findMostSpecificRule,
} from "../../extension/utils.js";

test("endsWithDomain matches exact and subdomain boundaries", () => {
  assert.equal(endsWithDomain("example.com", "example.com"), true);
  assert.equal(endsWithDomain("api.example.com", "example.com"), true);
  assert.equal(endsWithDomain("notexample.com", "example.com"), false);
  assert.equal(endsWithDomain("", "example.com"), false);
});

test("findMostSpecificRule returns the longest matching domain", () => {
  const rules = {
    "example.com": { type: "RANDOM_PROXY" },
    "api.example.com": { type: "PROXY_BY_RULE", proxyName: "p1" },
    "com": { type: "NO_PROXY" },
  };

  const result = findMostSpecificRule("v1.api.example.com", rules);
  assert.deepEqual(result, {
    rule: { type: "PROXY_BY_RULE", proxyName: "p1" },
    matchedDomain: "api.example.com",
  });
});

test("chooseDeterministicProxy is stable for the same hostname", () => {
  const proxies = [{ name: "p1" }, { name: "p2" }, { name: "p3" }];

  const first = chooseDeterministicProxy("example.com", proxies);
  const second = chooseDeterministicProxy("example.com", proxies);

  assert.deepEqual(first, second);
});

test("chooseDeterministicProxy returns null for empty list", () => {
  assert.equal(chooseDeterministicProxy("example.com", []), null);
});
