import { TIMEOUTS, createLogger } from "../utils.js";
import * as storage from "../shared/storage.js";
import { initProxyControls } from "./proxy-controls.js";
import { initSiteRules } from "./site-rules.js";
import { initProxyCrud } from "./proxy-crud.js";
import { renderPopupShell } from "./templates.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderPopupShell(document.getElementById("popupRoot"));

  // --- Shared state ---
  let currentTabDomain = "";

  const logger = createLogger(false);
  let loggingEnabled = false;
  let themePreference = "light";

  const logDebug = (...args) => logger.debug(...args);
  const logError = (...args) => logger.error(...args);

  // --- Screen navigation ---
  const screens = document.querySelectorAll(".screen");
  const screenNavButtons = document.querySelectorAll("[data-screen-target]");

  const setActiveScreen = (screenId) => {
    screens.forEach((screen) => screen.classList.remove("active"));
    const nextScreen = document.getElementById(screenId);
    if (nextScreen) {
      nextScreen.classList.add("active");
    }

    if (screenId === "rulesScreen") {
      siteRulesModule.renderSiteRules();
    } else if (screenId === "proxiesScreen") {
      proxyCrudModule.renderProxies();
    }
  };

  screenNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.screenTarget;
      if (target) {
        setActiveScreen(target);
      }
    });
  });

  // --- Initialize site rules module (before proxy controls, which needs refs) ---
  const siteRulesModule = initSiteRules({
    refreshStatus: () => proxyControlsApi.refreshStatus(),
  });

  // --- Initialize proxy controls ---
  const proxyControlsApi = initProxyControls({
    proxyToggle: document.getElementById("proxyToggle"),
    proxySelect: document.getElementById("proxySelect"),
    pageProxyToggle: document.getElementById("pageProxyToggle"),
    pageProxySelect: document.getElementById("pageProxySelect"),
    proxyToggleLabel: document.getElementById("proxyToggleLabel"),
    pageProxyToggleLabel: document.getElementById("pageProxyToggleLabel"),
    pageProxyInfoIcon: document.getElementById("pageProxyInfoIcon"),
    proxyModeHint: document.getElementById("proxyModeHint"),
    addRuleButtons: document.querySelectorAll("[data-add-rule]"),
    proxyStatusDisplay: document.getElementById("proxyStatusDisplay"),
    getTabDomain: () => currentTabDomain,
    logDebug,
    logError,
    setActiveScreen,
    getSiteDomainInput: () => siteRulesModule.getSiteDomainInput(),
    getSiteProxySelect: () => siteRulesModule.getSiteProxySelect(),
    getAddSiteRuleButton: () => siteRulesModule.getAddSiteRuleButton(),
    resetSiteRuleEditor: () => siteRulesModule.resetRuleEditor(),
  });

  // --- Initialize proxy CRUD ---
  const proxyCrudModule = initProxyCrud({
    refreshStatus: () => proxyControlsApi.refreshStatus(),
    loadMainControls: () => proxyControlsApi.loadMainControls(),
    loadProxiesForDropdown: () => siteRulesModule.loadProxiesForDropdown(),
    renderSiteRules: () => siteRulesModule.renderSiteRules(),
    setActiveScreen,
    logDebug,
  });

  // --- Tab info helper ---
  const getCurrentTabInfo = async () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = TIMEOUTS.tabMaxAttempts;
      const retryInterval = TIMEOUTS.tabRetryInterval;

      const tryGetTab = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length === 0) {
            logDebug("No active tab found.");
            currentTabDomain = "";
            resolve();
            return;
          }

          const tab = tabs[0];
          if (tab.url) {
            try {
              const urlObj = new URL(tab.url);
              currentTabDomain = urlObj.hostname;
              logDebug("Current Tab URL:", tab.url);
              logDebug("Current Tab Domain:", currentTabDomain);
            } catch (e) {
              logError("Invalid URL:", tab.url, e);
              currentTabDomain = "";
            }
            resolve();
          } else {
            attempts++;
            if (attempts < maxAttempts) {
              logDebug(
                `Tab URL not ready, retrying... (${attempts}/${maxAttempts})`
              );
              setTimeout(tryGetTab, retryInterval);
            } else {
              logDebug("Max retries reached, no URL available.");
              currentTabDomain = "";
              resolve();
            }
          }
        });
      };

      tryGetTab();
    });
  };

  // --- Logging toggle ---
  const loggingToggleButton = document.getElementById("loggingToggle");
  const themeToggleButton = document.getElementById("themeToggle");
  const onboardingOverlay = document.getElementById("onboardingOverlay");
  const showOnboardingButton = document.getElementById("showOnboardingButton");
  const skipOnboardingButton = document.getElementById("skipOnboardingButton");
  const startOnboardingButton = document.getElementById("startOnboardingButton");

  const applyThemePreference = () => {
    document.documentElement.dataset.theme = themePreference;
    themeToggleButton.classList.toggle("enabled", themePreference === "dark");
    themeToggleButton.textContent =
      themePreference === "dark" ? "Dark" : "Light";
    themeToggleButton.setAttribute(
      "aria-pressed",
      String(themePreference === "dark")
    );
  };

  const updateLoggingToggleState = () => {
    loggingToggleButton.classList.toggle("enabled", loggingEnabled);
    loggingToggleButton.textContent = loggingEnabled ? "On" : "Off";
    loggingToggleButton.setAttribute("aria-pressed", String(loggingEnabled));
  };

  const setOnboardingVisible = (visible) => {
    onboardingOverlay.hidden = !visible;
  };

  const completeOnboarding = async () => {
    setOnboardingVisible(false);
    await storage.setOnboardingCompleted(true);
  };

  themeToggleButton.addEventListener("click", () => {
    themePreference = themePreference === "dark" ? "light" : "dark";
    applyThemePreference();
    storage.setThemePreference(themePreference);
  });

  loggingToggleButton.addEventListener("click", () => {
    loggingEnabled = !loggingEnabled;
    logger.setEnabled(loggingEnabled);
    updateLoggingToggleState();

    storage.setLoggingEnabled(loggingEnabled).then(() => {
      chrome.runtime.sendMessage({
        action: "setLoggingEnabled",
        enabled: loggingEnabled,
      });
    });
  });

  showOnboardingButton.addEventListener("click", () => {
    setOnboardingVisible(true);
  });

  skipOnboardingButton.addEventListener("click", () => {
    completeOnboarding();
  });

  startOnboardingButton.addEventListener("click", async () => {
    await completeOnboarding();
    setActiveScreen("proxiesScreen");
  });

  // --- Refresh active screen helper ---
  const refreshActiveScreen = () => {
    const activeScreen = document.querySelector(".screen.active");
    if (!activeScreen) {
      return;
    }

    if (activeScreen.id === "rulesScreen") {
      siteRulesModule.renderSiteRules();
    } else if (activeScreen.id === "proxiesScreen") {
      proxyCrudModule.renderProxies();
    }
  };

  // --- Initialization ---
  await getCurrentTabInfo();
  proxyControlsApi.updateOnlyThisPageLabel();

  loggingEnabled = await storage.getLoggingEnabled();
  logger.setEnabled(loggingEnabled);
  console.info("[ProxyExt] Requested logging:", loggingEnabled);
  updateLoggingToggleState();

  themePreference = await storage.getThemePreference();
  applyThemePreference();

  const onboardingCompleted = await storage.getOnboardingCompleted();
  setOnboardingVisible(!onboardingCompleted);

  await siteRulesModule.loadProxiesForDropdown();
  await proxyControlsApi.loadMainControls();
  refreshActiveScreen();
});
