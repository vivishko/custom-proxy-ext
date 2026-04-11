import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LOCALE,
  getString,
  resolveLocale,
} from "../../extension/strings.js";

test("resolveLocale maps full locale code to base locale", () => {
  assert.equal(resolveLocale("ru-RU"), "ru");
});

test("resolveLocale falls back to default for unknown locale", () => {
  assert.equal(resolveLocale("de-DE"), DEFAULT_LOCALE);
});

test("getString returns localized value for available key", () => {
  assert.equal(
    getString("toggles.global", { locale: "ru-RU" }),
    "Глобальный прокси"
  );
});

test("getString falls back to default locale when key is missing in locale", () => {
  assert.equal(
    getString("hints.noProxiesAvailable", { locale: "ru-RU" }),
    "No proxies available"
  );
});

test("getString falls back to default locale when locale is unsupported", () => {
  assert.equal(
    getString("toggles.onlyThisPage", { locale: "es-ES" }),
    "Only this page"
  );
});
