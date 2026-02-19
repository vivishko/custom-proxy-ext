import test from "node:test";
import assert from "node:assert/strict";

import {
  validateImportedProxies,
  validateImportedSiteRules,
  validateProxy,
} from "../../extension/popup/validation.js";

test("validateProxy rejects missing required fields", () => {
  const error = validateProxy(
    {
      name: "proxy-1",
      host: "",
      port: 8080,
      country: "US",
    },
    []
  );

  assert.equal(
    error,
    "Please fill in all required proxy fields (Name, Host, Port, Country)."
  );
});

test("validateProxy rejects invalid port", () => {
  const error = validateProxy(
    {
      name: "proxy-1",
      host: "127.0.0.1",
      port: 70000,
      country: "US",
    },
    []
  );

  assert.equal(error, "Please enter a valid port number (1-65535).");
});

test("validateProxy rejects duplicate names", () => {
  const error = validateProxy(
    {
      name: "existing",
      host: "127.0.0.1",
      port: 8080,
      country: "US",
    },
    [{ name: "existing", host: "1.1.1.1", port: 80, country: "DE" }]
  );

  assert.equal(
    error,
    "A proxy with this name already exists. Please choose a different name."
  );
});

test("validateProxy accepts valid proxy", () => {
  const error = validateProxy(
    {
      name: "new-proxy",
      host: "127.0.0.1",
      port: 8080,
      country: "US",
    },
    [{ name: "existing", host: "1.1.1.1", port: 80, country: "DE" }]
  );

  assert.equal(error, null);
});

test("validateImportedProxies validates array structure and duplicate names", () => {
  assert.equal(validateImportedProxies({}), "Invalid proxies file format.");

  assert.equal(
    validateImportedProxies([
      { name: "p1", host: "1.1.1.1", port: 80, country: "DE" },
      { name: "p1", host: "2.2.2.2", port: 81, country: "US" },
    ]),
    "Duplicate proxy name in import: p1"
  );
});

test("validateImportedProxies accepts valid array", () => {
  assert.equal(
    validateImportedProxies([
      { name: "p1", host: "1.1.1.1", port: 80, country: "DE" },
      { name: "p2", host: "2.2.2.2", port: 81, country: "US" },
    ]),
    null
  );
});

test("validateImportedSiteRules accepts plain object and rejects arrays", () => {
  assert.equal(validateImportedSiteRules({ "example.com": {} }), null);
  assert.equal(
    validateImportedSiteRules(["example.com"]),
    "Invalid site rules file format."
  );
});
