import { TIMEOUTS } from "../utils.js";
import * as storage from "../shared/storage.js";
import { paginateItems } from "./pagination.js";
import { validateProxy, validateImportedProxies } from "./validation.js";

const PROXIES_PAGE_SIZE = 10;
const DELETE_WARNING_DOMAIN_PREVIEW_LIMIT = 5;

/**
 * Find site-rule domains that depend on the given proxy name.
 * @param {Object<string, Object>} siteRules
 * @param {string} proxyName
 * @returns {string[]}
 */
export function getDependentRuleDomains(siteRules, proxyName) {
  if (!siteRules || !proxyName) {
    return [];
  }

  return Object.keys(siteRules).filter((domain) => {
    const rule = siteRules[domain];
    if (!rule || typeof rule !== "object") {
      return false;
    }
    return (
      rule.type === "PROXY_BY_RULE" &&
      rule.proxyName === proxyName
    );
  });
}

/**
 * Build user-facing warning text before proxy deletion.
 * @param {string} proxyName
 * @param {string[]} dependentDomains
 * @returns {string}
 */
export function buildProxyDeleteWarningMessage(proxyName, dependentDomains) {
  if (!Array.isArray(dependentDomains) || dependentDomains.length === 0) {
    return [
      `Delete proxy "${proxyName}"?`,
      "",
      "Consequences:",
      "- Proxy will be removed from the proxies list.",
      "- Temporary per-page proxy bindings using this proxy will be removed.",
    ].join("\n");
  }

  const previewDomains = dependentDomains.slice(
    0,
    DELETE_WARNING_DOMAIN_PREVIEW_LIMIT
  );
  const hasMoreDomains = dependentDomains.length > previewDomains.length;
  const domainsPreviewText = hasMoreDomains
    ? `${previewDomains.join(", ")} (+${dependentDomains.length - previewDomains.length} more)`
    : previewDomains.join(", ");

  return [
    `Delete proxy "${proxyName}"?`,
    "",
    `This proxy is used by ${dependentDomains.length} site rule(s):`,
    domainsPreviewText,
    "",
    "Consequences:",
    "- Those rules will be switched to NO_PROXY.",
    "- Temporary per-page proxy bindings using this proxy will be removed.",
  ].join("\n");
}

/**
 * Build next storage state after proxy deletion.
 * @param {Object} params
 * @param {Array<Object>} params.proxies
 * @param {Object<string, Object>} params.siteRules
 * @param {Object<string, string>} params.temporaryProxySites
 * @param {string} params.proxyName
 * @returns {Object}
 */
export function buildProxyDeletionState({
  proxies,
  siteRules,
  temporaryProxySites,
  proxyName,
}) {
  const updatedProxies = (proxies || []).filter((p) => p.name !== proxyName);

  const updatedSiteRules = { ...(siteRules || {}) };
  let rulesUpdatedCount = 0;
  for (const domain in updatedSiteRules) {
    const rule = updatedSiteRules[domain];
    if (!rule || typeof rule !== "object") {
      continue;
    }
    if (rule.type === "PROXY_BY_RULE" && rule.proxyName === proxyName) {
      updatedSiteRules[domain] = { type: "NO_PROXY" };
      rulesUpdatedCount += 1;
    }
  }

  const updatedTemporaryProxySites = { ...(temporaryProxySites || {}) };
  let temporaryUpdated = false;
  for (const domain in updatedTemporaryProxySites) {
    if (updatedTemporaryProxySites[domain] === proxyName) {
      delete updatedTemporaryProxySites[domain];
      temporaryUpdated = true;
    }
  }

  return {
    updatedProxies,
    updatedSiteRules,
    updatedTemporaryProxySites,
    rulesUpdatedCount,
    temporaryUpdated,
  };
}

/**
 * Resolve next last-selected proxy value after deletion.
 * @param {Object} params
 * @param {string|null} params.lastSelectedProxy
 * @param {string} params.deletedProxyName
 * @param {Array<Object>} params.updatedProxies
 * @returns {string|null}
 */
export function getLastSelectedProxyAfterDeletion({
  lastSelectedProxy,
  deletedProxyName,
  updatedProxies,
}) {
  if (lastSelectedProxy !== deletedProxyName) {
    return lastSelectedProxy || null;
  }

  if (!Array.isArray(updatedProxies) || updatedProxies.length === 0) {
    return null;
  }

  const fallbackProxyName = updatedProxies[updatedProxies.length - 1].name;
  if (typeof fallbackProxyName !== "string" || !fallbackProxyName.trim()) {
    return null;
  }

  return fallbackProxyName;
}

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
  const proxiesPrevPageButton = document.getElementById("proxiesPrevPageButton");
  const proxiesNextPageButton = document.getElementById("proxiesNextPageButton");
  const proxiesPageLabel = document.getElementById("proxiesPageLabel");

  let currentPage = 1;
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
    const { items: pageProxies, pagination } = paginateItems(
      proxies,
      currentPage,
      PROXIES_PAGE_SIZE
    );
    currentPage = pagination.currentPage;

    proxiesTableBody.innerHTML = "";
    proxiesPageLabel.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
    proxiesPrevPageButton.disabled = pagination.currentPage === 1;
    proxiesNextPageButton.disabled =
      pagination.currentPage === pagination.totalPages;

    pageProxies.forEach((proxy) => {
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
        const siteRules = await storage.getSiteRules();
        const dependentDomains = getDependentRuleDomains(siteRules, proxy.name);
        const confirmDelete = confirm(
          buildProxyDeleteWarningMessage(proxy.name, dependentDomains)
        );
        if (!confirmDelete) {
          return;
        }

        const currentProxies = await storage.getProxies();
        const temporaryProxySites = await storage.getTemporaryProxySites();
        const {
          updatedProxies,
          updatedSiteRules,
          updatedTemporaryProxySites,
          rulesUpdatedCount,
          temporaryUpdated,
        } = buildProxyDeletionState({
          proxies: currentProxies,
          siteRules,
          temporaryProxySites,
          proxyName: proxy.name,
        });

        await storage.setProxies(updatedProxies);
        if (rulesUpdatedCount > 0) {
          await storage.setSiteRules(updatedSiteRules);
        }
        if (temporaryUpdated) {
          await storage.setTemporaryProxySites(updatedTemporaryProxySites);
        }

        const lastSelectedProxy = await storage.getLastSelectedProxy();
        if (lastSelectedProxy === proxy.name) {
          const fallbackProxyName = getLastSelectedProxyAfterDeletion({
            lastSelectedProxy,
            deletedProxyName: proxy.name,
            updatedProxies,
          });
          await storage.setLastSelectedProxy(fallbackProxyName);
        }

        await renderProxies();
        await loadProxiesForDropdown();
        await renderSiteRules();
        await loadMainControls();
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        await refreshStatus();

        if (rulesUpdatedCount > 0) {
          showProxiesFeedback(
            `Proxy "${proxy.name}" deleted. ${rulesUpdatedCount} dependent rule(s) switched to NO_PROXY.`
          );
        } else {
          showProxiesFeedback(`Proxy "${proxy.name}" deleted.`);
        }
      });
      actionsCell.appendChild(deleteButton);
    });
  };

  proxiesPrevPageButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderProxies();
    }
  });

  proxiesNextPageButton.addEventListener("click", () => {
    currentPage += 1;
    renderProxies();
  });

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
    currentPage = Math.ceil(proxies.length / PROXIES_PAGE_SIZE);

    addProxyForm.reset();
    await renderProxies();
    await loadProxiesForDropdown();
    await loadMainControls();
    setActiveScreen("proxiesScreen");
    showProxiesFeedback(`Proxy "${newProxy.name}" saved.`);
    chrome.runtime.sendMessage({ action: "updateProxySettings" });
    await refreshStatus();

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
          await renderProxies();
          await loadProxiesForDropdown();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          await refreshStatus();
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
