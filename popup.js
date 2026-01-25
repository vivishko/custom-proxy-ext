import { STORAGE_KEYS, createLogger, findMostSpecificRule } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  const proxyToggle = document.getElementById("proxyToggle");
  const proxySelect = document.getElementById("proxySelect");
  const pageProxyToggle = document.getElementById("pageProxyToggle");
  const addRuleButtons = document.querySelectorAll("[data-add-rule]");
  const proxyStatusDisplay = document.getElementById("proxyStatusDisplay");
  const loggingToggleButton = document.getElementById("loggingToggle");

  let currentTabUrl = "";
  let currentTabDomain = "";

  const logger = createLogger(false);
  let loggingEnabled = false;

  const logDebug = (...args) => logger.debug(...args);
  const logError = (...args) => logger.error(...args);

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
      proxyStatusDisplay.textContent = "No active tab or domain.";
      return;
    }

    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const globalProxyEnabled = settings.globalProxyEnabled || false;
    const lastSelectedProxyName = settings.lastSelectedProxy || null;
    const siteRules = settings.siteRules || {};
    const temporaryDirectSites = settings.temporaryDirectSites || {};

    if (temporaryDirectSites[currentTabDomain]) {
      proxyStatusDisplay.textContent = `Proxy temporarily disabled for ${currentTabDomain}.`;
      return;
    }

    const { rule, matchedDomain } = findMostSpecificRule(
      currentTabDomain,
      siteRules
    );

    if (rule) {
      let statusMsg = "";
      const displayDomain = matchedDomain || currentTabDomain;

      if (rule.type === "NO_PROXY") {
        statusMsg = globalProxyEnabled
          ? `Proxy: DIRECT (Global proxy exception for ${displayDomain})`
          : `Proxy: DIRECT (Rule for ${displayDomain})`;
      } else if (rule.type === "RANDOM_PROXY") {
        statusMsg = globalProxyEnabled
          ? `Proxy: RANDOM (Overrides global for ${displayDomain})`
          : `Proxy: RANDOM (Rule for ${displayDomain})`;
      } else if (rule.type === "PROXY_BY_RULE" && rule.proxyName) {
        statusMsg = globalProxyEnabled
          ? `Proxy: ${rule.proxyName} (Overrides global for ${displayDomain})`
          : `Proxy: ${rule.proxyName} (Rule for ${displayDomain})`;
      } else if (rule.type === "DIRECT_TEMPORARY") {
        statusMsg = `Proxy: DIRECT (Temporary rule for ${displayDomain})`;
      }

      proxyStatusDisplay.textContent = statusMsg;
      return;
    }

    if (globalProxyEnabled && lastSelectedProxyName) {
      proxyStatusDisplay.textContent = `Proxy: ${lastSelectedProxyName} (Global)`;
      pageProxyToggle.checked = false;
      return;
    }

    proxyStatusDisplay.textContent = "Proxy: DIRECT (No rules or global proxy)";
    pageProxyToggle.checked = false;
  };

  // --- Proxy Management (Main Popup Controls) ---
  const loadMainControls = async () => {
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    const proxies = settings.proxies || [];
    const globalProxyEnabled = settings.globalProxyEnabled || false;
    const lastSelectedProxy = settings.lastSelectedProxy || null;
    const temporaryDirectSites = settings.temporaryDirectSites || {};
    const siteRules = settings.siteRules || {};

    proxySelect.innerHTML = "";
    if (proxies.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No proxies available";
      proxySelect.appendChild(option);
      proxySelect.disabled = true;
      proxyToggle.disabled = true;
      pageProxyToggle.disabled = true;
      addRuleButton.disabled = true;
      return;
    }

    proxies.forEach((proxy) => {
      const option = document.createElement("option");
      option.value = proxy.name;
      option.textContent = `${proxy.name} (${proxy.country})`;
      proxySelect.appendChild(option);
    });

    proxyToggle.checked = globalProxyEnabled;
    proxySelect.disabled = !globalProxyEnabled;
    if (lastSelectedProxy) {
      proxySelect.value = lastSelectedProxy;
    } else if (proxies.length > 0) {
      proxySelect.value = proxies[proxies.length - 1].name;
    }

    pageProxyToggle.checked = !!temporaryDirectSites[currentTabDomain];
    const { rule: matchingRule } = findMostSpecificRule(
      currentTabDomain,
      siteRules
    );
    pageProxyToggle.disabled = !globalProxyEnabled && !matchingRule;

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
    proxySelect.disabled = !isEnabled;
    pageProxyToggle.disabled = !isEnabled;

    await chrome.storage.sync.set({ globalProxyEnabled: isEnabled });

    if (isEnabled) {
      const selectedProxyName = proxySelect.value;
      await chrome.storage.sync.set({ lastSelectedProxy: selectedProxyName });
      chrome.runtime.sendMessage({
        action: "applyProxy",
        proxyName: selectedProxyName,
      });
    } else {
      await chrome.storage.sync.set({ temporaryDirectSites: {} });
      pageProxyToggle.checked = false;
      chrome.runtime.sendMessage({ action: "clearProxy" });
    }
    updateProxyStatusDisplay();
  });

  proxySelect.addEventListener("change", async () => {
    const selectedProxyName = proxySelect.value;
    await chrome.storage.sync.set({ lastSelectedProxy: selectedProxyName });
    if (proxyToggle.checked) {
      chrome.runtime.sendMessage({
        action: "applyProxy",
        proxyName: selectedProxyName,
      });
    }
    updateProxyStatusDisplay();
  });

  pageProxyToggle.addEventListener("change", async () => {
    const isEnabled = pageProxyToggle.checked;
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    let temporaryDirectSites = settings.temporaryDirectSites || {};

    if (currentTabDomain) {
      if (isEnabled) {
        temporaryDirectSites[currentTabDomain] = true;
      } else {
        delete temporaryDirectSites[currentTabDomain];
      }
      await chrome.storage.sync.set({ temporaryDirectSites });
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
    }
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
  const exportProxiesButton = document.getElementById("exportProxiesButton");
  const importProxiesFile = document.getElementById("importProxiesFile");
  const importProxiesButton = document.getElementById("importProxiesButton");

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
