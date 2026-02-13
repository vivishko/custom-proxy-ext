import { STORAGE_KEYS } from "../utils.js";
import { DEFAULT_LOCALE, STRINGS } from "../strings.js";
import * as storage from "./storage.js";
import {
  resolveTemporaryProxyName,
  buildProxyOptions,
  setModeHint,
  showModeInteractionHint,
  updateProxyStatusDisplay,
} from "./ui-render.js";

const strings = STRINGS[DEFAULT_LOCALE];

/**
 * Initialize and wire up the main proxy controls (global toggle, page toggle, selects).
 * @param {Object} deps - DOM elements and shared state.
 */
export function initProxyControls(deps) {
  const {
    proxyToggle,
    proxySelect,
    pageProxyToggle,
    pageProxySelect,
    proxyToggleLabel,
    pageProxyToggleLabel,
    pageProxyInfoIcon,
    proxyModeHint,
    addRuleButtons,
    proxyStatusDisplay,
    getTabDomain,
    logDebug,
    logError,
    setActiveScreen,
    getSiteDomainInput,
    getSiteProxySelect,
    getAddSiteRuleButton,
  } = deps;

  const refreshStatus = () => {
    updateProxyStatusDisplay({
      statusEl: proxyStatusDisplay,
      pageProxyToggle,
      currentTabDomain: getTabDomain(),
    });
  };

  const updateOnlyThisPageLabel = () => {
    pageProxyToggleLabel.textContent = strings.toggles.onlyThisPage;
  };

  /**
   * Load and render main controls from current storage state.
   */
  const loadMainControls = async () => {
    const settings = await storage.getAllSettings();
    const proxies = settings[STORAGE_KEYS.proxies] || [];
    const globalProxyEnabled = settings[STORAGE_KEYS.globalProxyEnabled] || false;
    const lastSelectedProxy = settings[STORAGE_KEYS.lastSelectedProxy] || null;
    const temporaryProxySites = settings[STORAGE_KEYS.temporaryProxySites] || {};
    const currentTabDomain = getTabDomain();

    proxyToggleLabel.textContent = strings.toggles.global;
    updateOnlyThisPageLabel();

    proxySelect.innerHTML = "";
    pageProxySelect.innerHTML = "";
    setModeHint(proxyModeHint, "");

    if (proxies.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = strings.hints.noProxiesAvailable;
      proxySelect.appendChild(option);
      pageProxySelect.appendChild(option.cloneNode(true));
      proxySelect.disabled = true;
      proxyToggle.disabled = true;
      pageProxyToggle.disabled = true;
      pageProxySelect.disabled = true;
      proxyToggle.checked = false;
      pageProxyToggle.checked = false;
      addRuleButtons.forEach((button) => {
        button.disabled = true;
      });
      refreshStatus();
      return;
    }

    proxySelect.appendChild(buildProxyOptions(proxies));
    pageProxySelect.appendChild(buildProxyOptions(proxies));

    proxyToggle.checked = globalProxyEnabled;
    proxySelect.disabled = false;
    if (lastSelectedProxy) {
      proxySelect.value = lastSelectedProxy;
    } else if (proxies.length > 0) {
      proxySelect.value = proxies[proxies.length - 1].name;
    }

    const currentDomainProxyName = resolveTemporaryProxyName(
      temporaryProxySites[currentTabDomain],
      lastSelectedProxy
    );
    pageProxyToggle.checked = !!currentDomainProxyName;
    pageProxyToggle.disabled = !currentTabDomain;
    pageProxySelect.disabled = !currentTabDomain;
    if (currentDomainProxyName) {
      pageProxySelect.value = currentDomainProxyName;
    } else if (lastSelectedProxy) {
      pageProxySelect.value = lastSelectedProxy;
    } else if (proxies.length > 0) {
      pageProxySelect.value = proxies[proxies.length - 1].name;
    }

    addRuleButtons.forEach((button) => {
      button.disabled = !currentTabDomain;
    });

    refreshStatus();
  };

  // --- Event listeners ---

  proxyToggle.addEventListener("change", async () => {
    const isEnabled = proxyToggle.checked;
    const hasProxies = proxySelect.options.length > 0 && !!proxySelect.value;
    const currentTabDomain = getTabDomain();
    proxySelect.disabled = !hasProxies;
    pageProxyToggle.disabled = !currentTabDomain || !hasProxies;
    pageProxySelect.disabled = !currentTabDomain || !hasProxies;

    try {
      if (isEnabled) {
        const selectedProxyName = proxySelect.value;
        await storage.setValues({
          [STORAGE_KEYS.globalProxyEnabled]: true,
          [STORAGE_KEYS.lastSelectedProxy]: selectedProxyName,
          [STORAGE_KEYS.temporaryProxySites]: {},
          [STORAGE_KEYS.temporaryDirectSites]: {},
        });
        pageProxyToggle.checked = false;
        chrome.runtime.sendMessage({
          action: "updateProxySettings",
          reloadActiveTab: true,
        });
      } else {
        await storage.setGlobalProxyEnabled(false);
        chrome.runtime.sendMessage({
          action: "updateProxySettings",
          reloadActiveTab: true,
        });
      }
      refreshStatus();
    } catch (error) {
      logError("Failed to update global proxy toggle:", error);
    }
  });

  proxySelect.addEventListener("change", async () => {
    const selectedProxyName = proxySelect.value;
    await storage.setLastSelectedProxy(selectedProxyName);
    if (!pageProxyToggle.checked) {
      pageProxySelect.value = selectedProxyName;
    }
    if (proxyToggle.checked) {
      chrome.runtime.sendMessage({
        action: "applyProxy",
        proxyName: selectedProxyName,
      });
    } else if (pageProxyToggle.checked) {
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
    }
    refreshStatus();
  });

  pageProxyToggle.addEventListener("change", async () => {
    const isEnabled = pageProxyToggle.checked;
    const settings = await storage.getAllSettings();
    let temporaryProxySites = settings[STORAGE_KEYS.temporaryProxySites] || {};
    const temporaryDirectSites = settings[STORAGE_KEYS.temporaryDirectSites] || {};
    const selectedProxyName = pageProxySelect.value || proxySelect.value;
    const currentTabDomain = getTabDomain();

    if (!selectedProxyName) {
      pageProxyToggle.checked = false;
      showModeInteractionHint(proxyModeHint, strings.hints.noProxies);
      return;
    }

    if (currentTabDomain) {
      try {
        if (isEnabled) {
          temporaryProxySites = { [currentTabDomain]: selectedProxyName };
          delete temporaryDirectSites[currentTabDomain];
          await storage.setValues({
            [STORAGE_KEYS.temporaryProxySites]: temporaryProxySites,
            [STORAGE_KEYS.temporaryDirectSites]: temporaryDirectSites,
            [STORAGE_KEYS.lastSelectedProxy]: selectedProxyName,
          });
        } else {
          delete temporaryProxySites[currentTabDomain];
          await storage.setTemporaryProxySites(temporaryProxySites);
        }
        chrome.runtime.sendMessage({
          action: "updateProxySettings",
          reloadActiveTab: true,
        });
        refreshStatus();
      } catch (error) {
        logError("Failed to update page proxy toggle:", error);
      }
    }
  });

  pageProxySelect.addEventListener("change", async () => {
    const currentTabDomain = getTabDomain();
    if (!currentTabDomain) {
      return;
    }
    const selectedProxyName = pageProxySelect.value || proxySelect.value;
    if (!selectedProxyName) {
      return;
    }
    await storage.setLastSelectedProxy(selectedProxyName);
    if (!pageProxyToggle.checked) {
      refreshStatus();
      return;
    }
    const temporaryProxySites = await storage.getTemporaryProxySites();
    temporaryProxySites[currentTabDomain] = selectedProxyName;
    await storage.setValues({
      [STORAGE_KEYS.temporaryProxySites]: temporaryProxySites,
      [STORAGE_KEYS.lastSelectedProxy]: selectedProxyName,
    });
    if (proxyToggle.checked) {
      proxySelect.value = selectedProxyName;
    }
    chrome.runtime.sendMessage({ action: "updateProxySettings" });
    refreshStatus();
  });

  // --- Add rule button on main screen ---
  const handleAddRuleClick = async () => {
    const currentTabDomain = getTabDomain();
    if (currentTabDomain) {
      setActiveScreen("rulesScreen");
      getSiteDomainInput().value = currentTabDomain;
      getSiteProxySelect().value = proxySelect.value || "RANDOM_PROXY";
      getAddSiteRuleButton().click();
    }
  };

  addRuleButtons.forEach((button) => {
    button.addEventListener("click", handleAddRuleClick);
  });

  // --- Disabled control hints ---
  const controlGroups = document.querySelectorAll("[data-control-group]");
  controlGroups.forEach((group) => {
    group.addEventListener("click", () => {
      const currentTabDomain = getTabDomain();
      if (proxyToggle.disabled || pageProxyToggle.disabled) {
        if (proxyToggle.disabled && pageProxyToggle.disabled) {
          showModeInteractionHint(proxyModeHint, strings.hints.noProxies);
          return;
        }
        if (!currentTabDomain && group.dataset.controlGroup === "page") {
          showModeInteractionHint(proxyModeHint, strings.hints.noDomain);
        }
      }
    });
  });

  // --- Info icon setup ---
  pageProxyInfoIcon.title = strings.hints.onlyThisPageInfo;
  pageProxyInfoIcon.setAttribute("aria-label", strings.hints.onlyThisPageInfo);

  return {
    loadMainControls,
    refreshStatus,
    updateOnlyThisPageLabel,
  };
}
