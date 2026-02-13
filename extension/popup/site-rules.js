import * as storage from "../shared/storage.js";
import { buildRuleProxyOptions } from "./ui-render.js";
import { validateImportedSiteRules } from "./validation.js";

/**
 * Initialize site rules screen: CRUD, import/export.
 * @param {Object} deps
 * @returns {Object} { renderSiteRules, loadProxiesForDropdown }
 */
export function initSiteRules(deps) {
  const { refreshStatus } = deps;

  const siteDomainInput = document.getElementById("siteDomainInput");
  const siteProxySelect = document.getElementById("siteProxySelect");
  const addSiteRuleButtonOptions = document.getElementById("addSiteRuleButtonOptions");
  const siteRulesTableBody = document.querySelector("#siteRulesTable tbody");
  const exportSiteRulesButton = document.getElementById("exportSiteRulesButton");
  const importSiteRulesFile = document.getElementById("importSiteRulesFile");
  const importSiteRulesButton = document.getElementById("importSiteRulesButton");

  let allProxies = [];

  const loadProxiesForDropdown = async () => {
    allProxies = await storage.getProxies();

    siteProxySelect.innerHTML = "";
    siteProxySelect.appendChild(buildRuleProxyOptions(allProxies));
  };

  const renderSiteRules = async () => {
    const siteRules = await storage.getSiteRules();
    siteRulesTableBody.innerHTML = "";

    for (const domain in siteRules) {
      const rule = siteRules[domain];
      const row = siteRulesTableBody.insertRow();

      const domainCell = row.insertCell();
      domainCell.textContent = domain;

      const proxyCell = row.insertCell();
      const select = document.createElement("select");
      select.appendChild(buildRuleProxyOptions(allProxies));

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
        await storage.setSiteRules(siteRules);
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        refreshStatus();
      });

      proxyCell.appendChild(select);

      const actionsCell = row.insertCell();
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-button");
      deleteButton.addEventListener("click", async () => {
        delete siteRules[domain];
        await storage.setSiteRules(siteRules);
        renderSiteRules();
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        refreshStatus();
      });
      actionsCell.appendChild(deleteButton);
    }
  };

  // --- Add rule ---
  addSiteRuleButtonOptions.addEventListener("click", async () => {
    const domain = siteDomainInput.value.trim();
    const selectedProxySetting = siteProxySelect.value;

    if (domain) {
      const siteRules = await storage.getSiteRules();

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

      await storage.setSiteRules(siteRules);
      siteDomainInput.value = "";
      renderSiteRules();
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
      refreshStatus();
    }
  });

  // --- Export ---
  exportSiteRulesButton.addEventListener("click", async () => {
    const siteRules = await storage.getSiteRules();
    const dataStr = JSON.stringify(siteRules, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "site_rules.json" });
  });

  // --- Import ---
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
          const error = validateImportedSiteRules(importedRules);
          if (error) {
            throw new Error(error);
          }
          const existingRules = await storage.getSiteRules();
          const mergedRules = { ...existingRules, ...importedRules };
          await storage.setSiteRules(mergedRules);
          renderSiteRules();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          refreshStatus();
          alert("Site rules imported successfully!");
        } catch (error) {
          alert("Error importing site rules: " + error.message);
        }
        importSiteRulesFile.value = "";
      };
      reader.readAsText(file);
    }
  });

  return {
    renderSiteRules,
    loadProxiesForDropdown,
    getSiteDomainInput: () => siteDomainInput,
    getSiteProxySelect: () => siteProxySelect,
    getAddSiteRuleButton: () => addSiteRuleButtonOptions,
  };
}
