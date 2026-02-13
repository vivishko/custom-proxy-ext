import { TIMEOUTS } from "../utils.js";
import * as storage from "./storage.js";
import { validateProxy, validateImportedProxies } from "./validation.js";

/**
 * Initialize proxy CRUD screen: add form, table, import/export.
 * @param {Object} deps
 * @returns {Object} { renderProxies }
 */
export function initProxyCrud(deps) {
  const {
    refreshStatus,
    loadMainControls,
    loadProxiesForDropdown,
    renderSiteRules,
    setActiveScreen,
    logDebug,
  } = deps;

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
    }, TIMEOUTS.feedbackDuration);
  };

  const renderProxies = async () => {
    const proxies = await storage.getProxies();
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
          await storage.setProxies(updatedProxies);

          const siteRules = await storage.getSiteRules();
          let rulesUpdated = false;
          for (const domain in siteRules) {
            if (
              siteRules[domain].type === "PROXY_BY_RULE" &&
              siteRules[domain].proxyName === proxy.name
            ) {
              delete siteRules[domain];
              rulesUpdated = true;
            }
          }
          if (rulesUpdated) {
            await storage.setSiteRules(siteRules);
          }

          const temporaryProxySites = await storage.getTemporaryProxySites();
          let temporaryUpdated = false;
          for (const domain in temporaryProxySites) {
            if (temporaryProxySites[domain] === proxy.name) {
              delete temporaryProxySites[domain];
              temporaryUpdated = true;
            }
          }
          if (temporaryUpdated) {
            await storage.setTemporaryProxySites(temporaryProxySites);
          }

          renderProxies();
          loadProxiesForDropdown();
          renderSiteRules();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          refreshStatus();
        }
      });
      actionsCell.appendChild(deleteButton);
    });
  };

  // --- Add proxy form ---
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

    const proxies = await storage.getProxies();
    const error = validateProxy(newProxy, proxies);
    if (error) {
      alert(error);
      return;
    }

    logDebug("Adding new proxy:", newProxy);

    proxies.push(newProxy);
    await storage.setProxies(proxies);

    addProxyForm.reset();
    renderProxies();
    loadProxiesForDropdown();
    loadMainControls();
    setActiveScreen("proxiesScreen");
    showProxiesFeedback(`Proxy "${newProxy.name}" saved.`);
    chrome.runtime.sendMessage({ action: "updateProxySettings" });
    refreshStatus();

    logDebug("Proxy added successfully");
  });

  // --- Export ---
  exportProxiesButton.addEventListener("click", async () => {
    const proxies = await storage.getProxies();
    const dataStr = JSON.stringify(proxies, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "proxies.json" });
  });

  // --- Import ---
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
          const error = validateImportedProxies(importedProxies);
          if (error) {
            throw new Error(error);
          }
          const existingProxies = await storage.getProxies();
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
          await storage.setProxies(mergedProxies);
          renderProxies();
          loadProxiesForDropdown();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          refreshStatus();
          alert("Proxies imported successfully!");
        } catch (error) {
          alert("Error importing proxies: " + error.message);
        }
        importProxiesFile.value = "";
      };
      reader.readAsText(file);
    }
  });

  return {
    renderProxies,
  };
}
