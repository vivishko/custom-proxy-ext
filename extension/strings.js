export const DEFAULT_LOCALE = "en";

export const STRINGS = {
  en: {
    toggles: {
      global: "Global proxy",
      onlyThisPage: "Only this page",
    },
    status: {
      noDomain: "This extension works only on pages with a domain.",
      direct: "Proxy: DIRECT (no proxy enabled)",
      global: "Proxy: {proxyName} (all sites)",
      onlyThisPage: "Proxy: {proxyName} (only for {domain})",
      ruleNoProxy: "Proxy: DIRECT (rule for {domain})",
      ruleRandom: "Proxy: RANDOM (rule for {domain})",
      ruleProxy: "Proxy: {proxyName} (rule for {domain})",
      ruleDirectTemporary: "Proxy: DIRECT (temporary rule for {domain})",
    },
    hints: {
      noProxies: "Add a proxy to enable this toggle.",
      onlyThisPageInfo:
        "Only this page applies only to this domain; Global still applies elsewhere.",
      noDomain: "This extension works only on pages with a domain.",
      noProxiesAvailable: "No proxies available",
    },
  },
  ru: {
    toggles: {
      global: "Глобальный прокси",
      onlyThisPage: "Только для этой страницы",
    },
    status: {
      noDomain: "Расширение работает только на страницах с доменом.",
      direct: "Прокси: DIRECT (прокси не включен)",
      global: "Прокси: {proxyName} (для всех сайтов)",
      onlyThisPage: "Прокси: {proxyName} (только для {domain})",
      ruleNoProxy: "Прокси: DIRECT (правило для {domain})",
      ruleRandom: "Прокси: RANDOM (правило для {domain})",
      ruleProxy: "Прокси: {proxyName} (правило для {domain})",
      ruleDirectTemporary: "Прокси: DIRECT (временное правило для {domain})",
    },
    hints: {
      noProxies: "Добавьте прокси, чтобы включить этот переключатель.",
      onlyThisPageInfo:
        "Режим \"Только для этой страницы\" работает только для текущего домена; глобальный режим действует на остальных сайтах.",
      noDomain: "Расширение работает только на страницах с доменом.",
    },
  },
};

export function formatString(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    return `{${key}}`;
  });
}

function readByPath(source, path) {
  return String(path || "")
    .split(".")
    .reduce((value, segment) => {
      if (value && typeof value === "object") {
        return value[segment];
      }
      return undefined;
    }, source);
}

export function resolveLocale(locale) {
  if (!locale || typeof locale !== "string") {
    return DEFAULT_LOCALE;
  }

  const normalized = locale.toLowerCase();
  if (STRINGS[normalized]) {
    return normalized;
  }

  const baseLocale = normalized.split("-")[0];
  if (STRINGS[baseLocale]) {
    return baseLocale;
  }

  return DEFAULT_LOCALE;
}

export function getCurrentLocale() {
  if (
    typeof navigator !== "undefined" &&
    navigator &&
    typeof navigator.language === "string"
  ) {
    return resolveLocale(navigator.language);
  }
  return DEFAULT_LOCALE;
}

export function getString(key, options = {}) {
  const locale = resolveLocale(options.locale);
  const values = options.values || {};
  const localizedTemplate = readByPath(STRINGS[locale], key);
  const defaultTemplate = readByPath(STRINGS[DEFAULT_LOCALE], key);
  const template = localizedTemplate ?? defaultTemplate ?? key;
  return formatString(template, values);
}
