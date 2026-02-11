import { STORAGE_KEYS, createLogger, findMostSpecificRule } from "./utils.js";
import { DEFAULT_LOCALE, STRINGS, formatString } from "./strings.js";

document.addEventListener("DOMContentLoaded", async () => {
  const proxyToggle = document.getElementById("proxyToggle");
  const proxySelect = document.getElementById("proxySelect");
  const pageProxyToggle = document.getElementById("pageProxyToggle");
  const pageProxySelect = document.getElementById("pageProxySelect");
  const proxyToggleLabel = document.getElementById("proxyToggleLabel");
  const pageProxyToggleLabel = document.getElementById("pageProxyToggleLabel");
  const pageProxyInfoIcon = document.getElementById("pageProxyInfoIcon");
  const proxyModeHint = document.getElementById("proxyModeHint");
  const addRuleButtons = document.querySelectorAll("[data-add-rule]");
  const proxyStatusDisplay = document.getElementById("proxyStatusDisplay");
  const loggingToggleButton = document.getElementById("loggingToggle");

  let currentTabUrl = "";
  let currentTabDomain = "";
  const strings = STRINGS[DEFAULT_LOCALE];

  const logger = createLogger(false);
  let loggingEnabled = false;

  const logDebug = (...args) => logger.debug(...args);
  const logError = (...args) => logger.error(...args);

  const resolveTemporaryProxyName = (value, fallback) => {
    if (typeof value === "string" && value.trim()) return value;
    if (value === true && fallback) return fallback;
    return null;
  };

  const setModeHint = (message = "") => {
    proxyModeHint.textContent = message;
  };

  const updateOnlyThisPageLabel = () => {
    pageProxyToggleLabel.textContent = strings.toggles.onlyThisPage;
  };

  const showModeInteractionHint = (message) => {
    setModeHint(message);
    window.setTimeout(() => {
      if (proxyModeHint.textContent === message) {
        setModeHint("");
      }
    }, 2200);
  };

  // --- Helper Functions ---
  const getCurrentTabInfo = async () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10;
      const retryInterval = 100;

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
            currentTabUrl = tab.url;
            try {
              const urlObj = new URL(currentTabUrl);
              currentTabDomain = urlObj.hostname;
              logDebug("Current Tab URL:", currentTabUrl);
              logDebug("Current Tab Domain:", currentTabDomain);
            } catch (e) {
              logError("Invalid URL:", currentTabUrl, e);
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

  const updateProxyStatusDisplay = async () => {
    if (!currentTabDomain) {
      proxyStatusDisplay.textContent = strings.status.noDomain;
      return;
    }

    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const globalProxyEnabled = settings.globalProxyEnabled || false;
    const lastSelectedProxyName = settings.lastSelectedProxy || null;
    const siteRules = settings.siteRules || {};
    const temporaryDirectSites = settings.temporaryDirectSites || {};
    const temporaryProxySites = settings.temporaryProxySites || {};
    const currentDomainProxyName = resolveTemporaryProxyName(
      temporaryProxySites[currentTabDomain],
      lastSelectedProxyName
    );
    const activeTemporaryDomains = Object.keys(temporaryProxySites).filter(
      (domain) =>
        resolveTemporaryProxyName(
          temporaryProxySites[domain],
          lastSelectedProxyName
        )
    );

    const { rule, matchedDomain } = findMostSpecificRule(
      currentTabDomain,
      siteRules
    );

    if (rule) {
      let statusMsg = strings.status.direct;
      const displayDomain = matchedDomain || currentTabDomain;

      if (rule.type === "NO_PROXY") {
        statusMsg = formatString(strings.status.ruleNoProxy, {
          domain: displayDomain,
        });
      } else if (rule.type === "RANDOM_PROXY") {
        statusMsg = formatString(strings.status.ruleRandom, {
          domain: displayDomain,
        });
      } else if (rule.type === "PROXY_BY_RULE" && rule.proxyName) {
        statusMsg = formatString(strings.status.ruleProxy, {
          proxyName: rule.proxyName,
          domain: displayDomain,
        });
      } else if (rule.type === "DIRECT_TEMPORARY") {
        statusMsg = formatString(strings.status.ruleDirectTemporary, {
          domain: displayDomain,
        });
      }

      proxyStatusDisplay.textContent = statusMsg;
      return;
    }

    if (temporaryDirectSites[currentTabDomain]) {
      proxyStatusDisplay.textContent = strings.status.direct;
      return;
    }

    if (currentDomainProxyName) {
      proxyStatusDisplay.textContent = formatString(strings.status.onlyThisPage, {
        proxyName: currentDomainProxyName,
        domain: currentTabDomain,
      });
      return;
    }

    if (globalProxyEnabled && lastSelectedProxyName) {
      proxyStatusDisplay.textContent = formatString(strings.status.global, {
        proxyName: lastSelectedProxyName,
      });
      return;
    }

    proxyStatusDisplay.textContent = strings.status.direct;
    if (activeTemporaryDomains.length > 0) {
      pageProxyToggle.checked = false;
    }
  };

  // --- Proxy Management (Main Popup Controls) ---
  const loadMainControls = async () => {
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const proxies = settings.proxies || [];
    const globalProxyEnabled = settings.globalProxyEnabled || false;
    const lastSelectedProxy = settings.lastSelectedProxy || null;
    const temporaryProxySites = settings.temporaryProxySites || {};
    proxyToggleLabel.textContent = strings.toggles.global;
    updateOnlyThisPageLabel();

    proxySelect.innerHTML = "";
    pageProxySelect.innerHTML = "";
    setModeHint("");

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
      updateProxyStatusDisplay();
      return;
    }

    proxies.forEach((proxy) => {
      const option = document.createElement("option");
      option.value = proxy.name;
      option.textContent = `${proxy.name} (${proxy.country})`;
      proxySelect.appendChild(option);
      pageProxySelect.appendChild(option.cloneNode(true));
    });

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

    updateProxyStatusDisplay();
  };

  const refreshActiveScreen = () => {
    const activeScreen = document.querySelector(".screen.active");
    if (!activeScreen) {
      return;
    }

    if (activeScreen.id === "rulesScreen") {
      renderSiteRules();
    } else if (activeScreen.id === "proxiesScreen") {
      renderProxies();
    }
  };

  proxyToggle.addEventListener("change", async () => {
    const isEnabled = proxyToggle.checked;
    const hasProxies = proxySelect.options.length > 0 && !!proxySelect.value;
    proxySelect.disabled = !hasProxies;
    pageProxyToggle.disabled = !currentTabDomain || !hasProxies;
    pageProxySelect.disabled = !currentTabDomain || !hasProxies;

    if (isEnabled) {
      const selectedProxyName = proxySelect.value;
      await chrome.storage.sync.set({
        globalProxyEnabled: true,
        lastSelectedProxy: selectedProxyName,
        temporaryProxySites: {},
        temporaryDirectSites: {},
      });
      pageProxyToggle.checked = false;
      chrome.runtime.sendMessage({
        action: "applyProxy",
        proxyName: selectedProxyName,
      });
    } else {
      await chrome.storage.sync.set({ globalProxyEnabled: false });
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
    }
    updateProxyStatusDisplay();
  });

  proxySelect.addEventListener("change", async () => {
    const selectedProxyName = proxySelect.value;
    await chrome.storage.sync.set({ lastSelectedProxy: selectedProxyName });
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
    updateProxyStatusDisplay();
  });

  pageProxyToggle.addEventListener("change", async () => {
    const isEnabled = pageProxyToggle.checked;
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    let temporaryProxySites = settings.temporaryProxySites || {};
    const temporaryDirectSites = settings.temporaryDirectSites || {};
    const selectedProxyName = pageProxySelect.value || proxySelect.value;

    if (!selectedProxyName) {
      pageProxyToggle.checked = false;
      showModeInteractionHint(strings.hints.noProxies);
      return;
    }

    if (currentTabDomain) {
      if (isEnabled) {
        temporaryProxySites = { [currentTabDomain]: selectedProxyName };
        delete temporaryDirectSites[currentTabDomain];
        await chrome.storage.sync.set({
          temporaryProxySites,
          temporaryDirectSites,
          lastSelectedProxy: selectedProxyName,
        });
      } else {
        delete temporaryProxySites[currentTabDomain];
        await chrome.storage.sync.set({ temporaryProxySites });
      }
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
    }
    updateProxyStatusDisplay();
  });

  pageProxySelect.addEventListener("change", async () => {
    if (!currentTabDomain) {
      return;
    }
    const selectedProxyName = pageProxySelect.value || proxySelect.value;
    if (!selectedProxyName) {
      return;
    }
    await chrome.storage.sync.set({ lastSelectedProxy: selectedProxyName });
    if (!pageProxyToggle.checked) {
      updateProxyStatusDisplay();
      return;
    }
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const temporaryProxySites = settings.temporaryProxySites || {};
    temporaryProxySites[currentTabDomain] = selectedProxyName;
    await chrome.storage.sync.set({
      temporaryProxySites,
      lastSelectedProxy: selectedProxyName,
    });
    if (proxyToggle.checked) {
      proxySelect.value = selectedProxyName;
    }
    chrome.runtime.sendMessage({ action: "updateProxySettings" });
    updateProxyStatusDisplay();
  });

  const handleAddRuleClick = async () => {
    if (currentTabDomain) {
      setActiveScreen("rulesScreen");
      siteDomainInput.value = currentTabDomain;
      siteProxySelect.value = proxySelect.value || "RANDOM_PROXY";
      addSiteRuleButtonOptions.click();
    }
  };

  addRuleButtons.forEach((button) => {
    button.addEventListener("click", handleAddRuleClick);
  });

  const controlGroups = document.querySelectorAll("[data-control-group]");
  controlGroups.forEach((group) => {
    group.addEventListener("click", () => {
      if (proxyToggle.disabled || pageProxyToggle.disabled) {
        if (proxyToggle.disabled && pageProxyToggle.disabled) {
          showModeInteractionHint(strings.hints.noProxies);
          return;
        }
        if (!currentTabDomain && group.dataset.controlGroup === "page") {
          showModeInteractionHint(strings.hints.noDomain);
        }
      }
    });
  });

  // --- Screen Navigation ---
  const screens = document.querySelectorAll(".screen");
  const screenNavButtons = document.querySelectorAll("[data-screen-target]");

  const setActiveScreen = (screenId) => {
    screens.forEach((screen) => screen.classList.remove("active"));
    const nextScreen = document.getElementById(screenId);
    if (nextScreen) {
      nextScreen.classList.add("active");
    }

    if (screenId === "rulesScreen") {
      renderSiteRules();
    } else if (screenId === "proxiesScreen") {
      renderProxies();
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

  // --- Site Rules Tab ---
  const siteDomainInput = document.getElementById("siteDomainInput");
  const siteProxySelect = document.getElementById("siteProxySelect");
  const addSiteRuleButtonOptions = document.getElementById(
    "addSiteRuleButtonOptions"
  );
  const siteRulesTableBody = document.querySelector("#siteRulesTable tbody");
  const exportSiteRulesButton = document.getElementById(
    "exportSiteRulesButton"
  );
  const importSiteRulesFile = document.getElementById("importSiteRulesFile");
  const importSiteRulesButton = document.getElementById(
    "importSiteRulesButton"
  );

  let allProxies = [];

  const loadProxiesForDropdown = async () => {
    const settings = await chrome.storage.sync.get("proxies");
    allProxies = settings.proxies || [];

    siteProxySelect.innerHTML = `
      <option value="NO_PROXY">NO_PROXY</option>
      <option value="RANDOM_PROXY">RANDOM_PROXY</option>
      <option value="DIRECT_TEMPORARY">DIRECT (Temporary)</option>
    `;
    allProxies.forEach((proxy) => {
      const option = document.createElement("option");
      option.value = proxy.name;
      option.textContent = proxy.name;
      siteProxySelect.appendChild(option);
    });
  };

  const renderSiteRules = async () => {
    const settings = await chrome.storage.sync.get("siteRules");
    const siteRules = settings.siteRules || {};
    siteRulesTableBody.innerHTML = "";

    for (const domain in siteRules) {
      const rule = siteRules[domain];
      const row = siteRulesTableBody.insertRow();

      const domainCell = row.insertCell();
      domainCell.textContent = domain;

      const proxyCell = row.insertCell();
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="NO_PROXY">NO_PROXY</option>
        <option value="RANDOM_PROXY">RANDOM_PROXY</option>
        <option value="DIRECT_TEMPORARY">DIRECT (Temporary)</option>
      `;
      allProxies.forEach((proxy) => {
        const option = document.createElement("option");
        option.value = proxy.name;
        option.textContent = proxy.name;
        select.appendChild(option);
      });

      select.value = rule.type === "PROXY_BY_RULE" ? rule.proxyName : rule.type;

      select.addEventListener("change", async (event) => {
        const newSetting = event.target.value;
        if (
          newSetting === "NO_PROXY" ||
          newSetting === "RANDOM_PROXY" ||
          newSetting === "DIRECT_TEMPORARY"
        ) {
          siteRules[domain].type = newSetting;
          delete siteRules[domain].proxyName;
        } else {
          siteRules[domain].type = "PROXY_BY_RULE";
          siteRules[domain].proxyName = newSetting;
        }
        await chrome.storage.sync.set({ siteRules });
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        updateProxyStatusDisplay();
      });

      proxyCell.appendChild(select);

      const actionsCell = row.insertCell();
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-button");
      deleteButton.addEventListener("click", async () => {
        delete siteRules[domain];
        await chrome.storage.sync.set({ siteRules });
        renderSiteRules();
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        updateProxyStatusDisplay();
      });
      actionsCell.appendChild(deleteButton);
    }
  };

  addSiteRuleButtonOptions.addEventListener("click", async () => {
    const domain = siteDomainInput.value.trim();
    const selectedProxySetting = siteProxySelect.value;

    if (domain) {
      const settings = await chrome.storage.sync.get("siteRules");
      const siteRules = settings.siteRules || {};

      if (
        selectedProxySetting === "NO_PROXY" ||
        selectedProxySetting === "RANDOM_PROXY" ||
        selectedProxySetting === "DIRECT_TEMPORARY"
      ) {
        siteRules[domain] = { type: selectedProxySetting };
      } else {
        siteRules[domain] = {
          type: "PROXY_BY_RULE",
          proxyName: selectedProxySetting,
        };
      }

      await chrome.storage.sync.set({ siteRules });
      siteDomainInput.value = "";
      renderSiteRules();
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
      updateProxyStatusDisplay();
    }
  });

  exportSiteRulesButton.addEventListener("click", async () => {
    const settings = await chrome.storage.sync.get("siteRules");
    const dataStr = JSON.stringify(settings.siteRules, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "site_rules.json" });
  });

  importSiteRulesButton.addEventListener("click", () => {
    importSiteRulesFile.click();
  });

  importSiteRulesFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedRules = JSON.parse(e.target.result);
          if (
            !importedRules ||
            typeof importedRules !== "object" ||
            Array.isArray(importedRules)
          ) {
            throw new Error("Invalid site rules file format.");
          }
          const existingSettings = await chrome.storage.sync.get("siteRules");
          const existingRules = existingSettings.siteRules || {};
          const mergedRules = { ...existingRules, ...importedRules };
          await chrome.storage.sync.set({ siteRules: mergedRules });
          renderSiteRules();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          updateProxyStatusDisplay();
          alert("Site rules imported successfully!");
        } catch (error) {
          alert("Error importing site rules: " + error.message);
        }
        importSiteRulesFile.value = "";
      };
      reader.readAsText(file);
    }
  });

  // --- Add Proxy Tab ---
  const addProxyForm = document.getElementById("addProxyForm");
  const proxyNameInput = document.getElementById("proxyName");
  const proxyHostInput = document.getElementById("proxyHost");
  const proxyPortInput = document.getElementById("proxyPort");
  const proxyUsernameInput = document.getElementById("proxyUsername");
  const proxyPasswordInput = document.getElementById("proxyPassword");
  const proxyCountryInput = document.getElementById("proxyCountry");
  const proxyProtocolInput = document.getElementById("proxyProtocol");
  const proxiesTableBody = document.querySelector("#proxiesTable tbody");
  const proxiesFeedback = document.getElementById("proxiesFeedback");
  const exportProxiesButton = document.getElementById("exportProxiesButton");
  const importProxiesFile = document.getElementById("importProxiesFile");
  const importProxiesButton = document.getElementById("importProxiesButton");
  let proxiesFeedbackTimeoutId = null;

  const showProxiesFeedback = (message) => {
    if (!proxiesFeedback) {
      return;
    }

    if (proxiesFeedbackTimeoutId !== null) {
      window.clearTimeout(proxiesFeedbackTimeoutId);
      proxiesFeedbackTimeoutId = null;
    }

    proxiesFeedback.textContent = message;
    proxiesFeedback.classList.add("visible");
    proxiesFeedbackTimeoutId = window.setTimeout(() => {
      proxiesFeedback.textContent = "";
      proxiesFeedback.classList.remove("visible");
      proxiesFeedbackTimeoutId = null;
    }, 2200);
  };

  const renderProxies = async () => {
    const settings = await chrome.storage.sync.get("proxies");
    const proxies = settings.proxies || [];
    proxiesTableBody.innerHTML = "";

    proxies.forEach((proxy) => {
      const row = proxiesTableBody.insertRow();

      const nameCell = row.insertCell();
      nameCell.textContent = proxy.name;

      const hostPortCell = row.insertCell();
      hostPortCell.textContent = `${proxy.host}:${proxy.port}`;

      const countryCell = row.insertCell();
      countryCell.textContent = proxy.country;

      const actionsCell = row.insertCell();
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-button");
      deleteButton.addEventListener("click", async () => {
        const confirmDelete = confirm(
          `Are you sure you want to delete proxy "${proxy.name}"? All site rules using this proxy will be removed.`
        );
        if (confirmDelete) {
          const updatedProxies = proxies.filter((p) => p.name !== proxy.name);
          await chrome.storage.sync.set({ proxies: updatedProxies });

          const siteSettings = await chrome.storage.sync.get("siteRules");
          let siteRules = siteSettings.siteRules || {};
          for (const domain in siteRules) {
            if (
              siteRules[domain].type === "PROXY_BY_RULE" &&
              siteRules[domain].proxyName === proxy.name
            ) {
              delete siteRules[domain];
            }
          }
          await chrome.storage.sync.set({ siteRules });

          const temporarySettings = await chrome.storage.sync.get(
            STORAGE_KEYS.temporaryProxySites
          );
          const temporaryProxySites =
            temporarySettings[STORAGE_KEYS.temporaryProxySites] || {};
          let temporaryUpdated = false;
          for (const domain in temporaryProxySites) {
            if (temporaryProxySites[domain] === proxy.name) {
              delete temporaryProxySites[domain];
              temporaryUpdated = true;
            }
          }
          if (temporaryUpdated) {
            await chrome.storage.sync.set({ temporaryProxySites });
          }

          renderProxies();
          loadProxiesForDropdown();
          renderSiteRules();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          updateProxyStatusDisplay();
        }
      });
      actionsCell.appendChild(deleteButton);
    });
  };

  addProxyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newProxy = {
      name: proxyNameInput.value.trim(),
      host: proxyHostInput.value.trim(),
      port: parseInt(proxyPortInput.value.trim(), 10),
      username: proxyUsernameInput.value.trim(),
      password: proxyPasswordInput.value.trim(),
      country: proxyCountryInput.value.trim(),
      protocol: proxyProtocolInput.value || "http",
    };

    if (
      !newProxy.name ||
      !newProxy.host ||
      !newProxy.port ||
      !newProxy.country
    ) {
      alert(
        "Please fill in all required proxy fields (Name, Host, Port, Country)."
      );
      return;
    }

    if (isNaN(newProxy.port) || newProxy.port < 1 || newProxy.port > 65535) {
      alert("Please enter a valid port number (1-65535).");
      return;
    }

    const settings = await chrome.storage.sync.get("proxies");
    const proxies = settings.proxies || [];

    if (proxies.some((p) => p.name === newProxy.name)) {
      alert(
        "A proxy with this name already exists. Please choose a different name."
      );
      return;
    }

    logDebug("Adding new proxy:", newProxy);

    proxies.push(newProxy);
    await chrome.storage.sync.set({ proxies });

    addProxyForm.reset();
    renderProxies();
    loadProxiesForDropdown();
    loadMainControls();
    setActiveScreen("proxiesScreen");
    showProxiesFeedback(`Proxy "${newProxy.name}" saved.`);
    chrome.runtime.sendMessage({ action: "updateProxySettings" });
    updateProxyStatusDisplay();

    logDebug("Proxy added successfully");
  });

  exportProxiesButton.addEventListener("click", async () => {
    const settings = await chrome.storage.sync.get("proxies");
    const dataStr = JSON.stringify(settings.proxies, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "proxies.json" });
  });

  importProxiesButton.addEventListener("click", () => {
    importProxiesFile.click();
  });

  importProxiesFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedProxies = JSON.parse(e.target.result);
          if (!Array.isArray(importedProxies)) {
            throw new Error("Invalid proxies file format.");
          }
          const seenNames = new Set();
          for (const p of importedProxies) {
            if (!p || !p.name || !p.host || !p.port || !p.country) {
              throw new Error("Invalid proxies file format.");
            }
            if (seenNames.has(p.name)) {
              throw new Error(`Duplicate proxy name in import: ${p.name}`);
            }
            seenNames.add(p.name);
          }
          const existingSettings = await chrome.storage.sync.get("proxies");
          const existingProxies = existingSettings.proxies || [];
          const mergedProxies = [...existingProxies];
          const indexByName = new Map(
            mergedProxies.map((p, idx) => [p.name, idx])
          );
          importedProxies.forEach((p) => {
            const idx = indexByName.get(p.name);
            if (idx === undefined) {
              indexByName.set(p.name, mergedProxies.length);
              mergedProxies.push(p);
            } else {
              mergedProxies[idx] = p;
            }
          });
          await chrome.storage.sync.set({ proxies: mergedProxies });
          renderProxies();
          loadProxiesForDropdown();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          updateProxyStatusDisplay();
          alert("Proxies imported successfully!");
        } catch (error) {
          alert("Error importing proxies: " + error.message);
        }
        importProxiesFile.value = "";
      };
      reader.readAsText(file);
    }
  });

  // --- Logging toggle button ---
  loggingToggleButton.addEventListener("click", () => {
    loggingEnabled = !loggingEnabled;
    logger.setEnabled(loggingEnabled);

    if (loggingEnabled) loggingToggleButton.classList.add("enabled");
    else loggingToggleButton.classList.remove("enabled");

    chrome.storage.sync.set(
      { [STORAGE_KEYS.loggingEnabled]: loggingEnabled },
      () => {
        chrome.runtime.sendMessage({
          action: "setLoggingEnabled",
          enabled: loggingEnabled,
        });
      }
    );
  });

  // --- Initialization ---
  const initializePopup = async () => {
    await getCurrentTabInfo();
    updateOnlyThisPageLabel();
    pageProxyInfoIcon.title = strings.hints.onlyThisPageInfo;
    pageProxyInfoIcon.setAttribute("aria-label", strings.hints.onlyThisPageInfo);

    const loggingSettings = await chrome.storage.sync.get(
      STORAGE_KEYS.loggingEnabled
    );
    loggingEnabled = !!loggingSettings[STORAGE_KEYS.loggingEnabled];
    logger.setEnabled(loggingEnabled);
    console.info("[ProxyExt] Requested logging:", loggingEnabled);
    if (loggingEnabled) loggingToggleButton.classList.add("enabled");
    else loggingToggleButton.classList.remove("enabled");

    await loadProxiesForDropdown();
    await loadMainControls();
    refreshActiveScreen();
  };

  initializePopup();
});
