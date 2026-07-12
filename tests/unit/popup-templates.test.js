import test from "node:test";
import assert from "node:assert/strict";

import { renderPopupShell } from "../../extension/popup/templates.js";

test("renderPopupShell mounts popup screens and required controls", () => {
  const root = { innerHTML: "" };

  renderPopupShell(root);

  for (const expectedId of [
    "loggingToggle",
    "mainScreen",
    "proxyStatusDisplay",
    "rulesScreen",
    "siteRulesTable",
    "proxiesScreen",
    "proxiesTable",
    "addProxyScreen",
    "addProxyForm",
    "settingsScreen",
    "themeToggle",
    "loggingToggle",
    "showOnboardingButton",
    "onboardingOverlay",
    "skipOnboardingButton",
    "startOnboardingButton",
  ]) {
    assert.match(root.innerHTML, new RegExp(`id="${expectedId}"`));
  }
});

test("renderPopupShell fails loudly when popup root is missing", () => {
  assert.throws(
    () => renderPopupShell(null),
    /Popup root element is missing/
  );
});
