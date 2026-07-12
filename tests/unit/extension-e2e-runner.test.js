import test from "node:test";
import assert from "node:assert/strict";

test("extension e2e runner module is importable", async () => {
  const module = await import("../../scripts/run-extension-e2e.mjs");

  assert.equal(typeof module.run, "function");
});
