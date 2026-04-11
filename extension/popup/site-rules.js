import * as storage from "../shared/storage.js";
import { buildRuleProxyOptions } from "./ui-render.js";
import {
  findDuplicateSiteRuleDomain,
  validateImportedSiteRules,
} from "./validation.js";

const RULE_SPECIAL_SETTINGS = new Set([
  "NO_PROXY",
  "RANDOM_PROXY",
  "DIRECT_TEMPORARY",
]);

export const IMPORT_DUPLICATE_STRATEGIES = {
  replace: "replace",
  skip: "skip",
};

export const RULE_FORM_MODES = {
  add: "add",
  edit: "edit",
};

export function normalizeSiteRuleDomain(domain) {
  return String(domain || "").trim().toLowerCase();
}

function isSpecialRuleType(type) {
  return RULE_SPECIAL_SETTINGS.has(type);
}

/**
 * Convert UI proxy setting value to persisted site-rule object.
 * @param {string} selectedProxySetting
 * @returns {Object}
 */
export function createSiteRuleFromSetting(selectedProxySetting) {
  if (RULE_SPECIAL_SETTINGS.has(selectedProxySetting)) {
    return { type: selectedProxySetting };
  }

  return {
    type: "PROXY_BY_RULE",
    proxyName: selectedProxySetting,
  };
}

/**
 * Prepare a site-rules object before upsert by handling domain rename/replacement.
 * @param {Object<string, Object>} siteRules
 * @param {Object} params
 * @param {string} params.domain
 * @param {string} [params.editingDomain]
 * @param {string|null} [params.duplicateDomain]
 * @returns {Object<string, Object>}
 */
export function prepareSiteRulesForSave(
  siteRules,
  { domain, editingDomain = "", duplicateDomain = null }
) {
  const nextRules = { ...(siteRules || {}) };

  if (duplicateDomain && duplicateDomain !== domain) {
    delete nextRules[duplicateDomain];
  }

  if (editingDomain && editingDomain !== domain) {
    delete nextRules[editingDomain];
  }

  return nextRules;
}

/**
 * Normalize imported rule entry into internal site-rule object.
 * Accepts only current object format.
 * @param {*} rawRule
 * @returns {{ type: string, proxyName?: string }|null}
 */
export function normalizeImportedSiteRule(rawRule) {
  if (!rawRule || typeof rawRule !== "object" || Array.isArray(rawRule)) {
    return null;
  }

  const type = String(rawRule.type || "").trim();
  const proxyName = String(rawRule.proxyName || "").trim();

  if (isSpecialRuleType(type)) {
    return { type };
  }
  if (type === "PROXY_BY_RULE" && proxyName) {
    return { type: "PROXY_BY_RULE", proxyName };
  }

  return null;
}

/**
 * Find case-insensitive conflicts between imported rules and existing rules.
 * @param {Object<string, Object>} existingRules
 * @param {Object<string, Object>} importedRules
 * @returns {Array<{ importedDomain: string, existingDomain: string }>}
 */
export function findImportSiteRuleConflicts(existingRules, importedRules) {
  if (!importedRules || typeof importedRules !== "object") {
    return [];
  }

  const conflicts = [];

  for (const rawImportedDomain of Object.keys(importedRules)) {
    const importedDomain = normalizeSiteRuleDomain(rawImportedDomain);
    if (!importedDomain) {
      continue;
    }
    const existingDomain = findDuplicateSiteRuleDomain(
      existingRules,
      importedDomain
    );
    if (existingDomain) {
      conflicts.push({ importedDomain, existingDomain });
    }
  }

  return conflicts;
}

/**
 * Merge imported rules into existing rules using explicit duplicate strategy.
 * @param {Object<string, Object>} existingRules
 * @param {Object<string, Object>} importedRules
 * @param {("replace"|"skip")} [duplicateStrategy]
 * @returns {{
 *   mergedRules: Object<string, Object>,
 *   stats: { totalImported: number, added: number, replaced: number, skipped: number, duplicates: number, skippedMissingProxy: number, skippedInvalid: number }
 * }}
 */
export function mergeImportedSiteRules(
  existingRules,
  importedRules,
  duplicateStrategy = IMPORT_DUPLICATE_STRATEGIES.replace,
  availableProxyNames = []
) {
  if (
    duplicateStrategy !== IMPORT_DUPLICATE_STRATEGIES.replace &&
    duplicateStrategy !== IMPORT_DUPLICATE_STRATEGIES.skip
  ) {
    throw new Error(`Unknown duplicate strategy: ${duplicateStrategy}`);
  }

  const mergedRules = { ...(existingRules || {}) };
  const importedDomains = Object.keys(importedRules || {});
  const availableProxyNameSet = new Set(
    (availableProxyNames || []).map((name) => String(name).trim())
  );
  const stats = {
    totalImported: importedDomains.length,
    added: 0,
    replaced: 0,
    skipped: 0,
    duplicates: 0,
    skippedMissingProxy: 0,
    skippedInvalid: 0,
  };

  for (const importedDomain of importedDomains) {
    const normalizedDomain = normalizeSiteRuleDomain(importedDomain);
    if (!normalizedDomain) {
      stats.skipped += 1;
      stats.skippedInvalid += 1;
      continue;
    }

    const importedRule = normalizeImportedSiteRule(importedRules[importedDomain]);
    if (!importedRule) {
      stats.skipped += 1;
      stats.skippedInvalid += 1;
      continue;
    }
    if (
      importedRule.type === "PROXY_BY_RULE" &&
      !availableProxyNameSet.has(String(importedRule.proxyName || "").trim())
    ) {
      stats.skipped += 1;
      stats.skippedMissingProxy += 1;
      continue;
    }

    const existingDomain = findDuplicateSiteRuleDomain(mergedRules, normalizedDomain);
    const hasDuplicate = Boolean(existingDomain);

    if (hasDuplicate) {
      stats.duplicates += 1;
      if (duplicateStrategy === IMPORT_DUPLICATE_STRATEGIES.skip) {
        stats.skipped += 1;
        continue;
      }
      stats.replaced += 1;
      if (existingDomain !== normalizedDomain) {
        delete mergedRules[existingDomain];
      }
    } else {
      stats.added += 1;
    }

    mergedRules[normalizedDomain] = importedRule;
  }

  return { mergedRules, stats };
}

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
  const cancelSiteRuleEditButton = document.getElementById("cancelSiteRuleEditButton");
  const siteRulesTableBody = document.querySelector("#siteRulesTable tbody");
  const exportSiteRulesButton = document.getElementById("exportSiteRulesButton");
  const importSiteRulesFile = document.getElementById("importSiteRulesFile");
  const importSiteRulesButton = document.getElementById("importSiteRulesButton");

  let allProxies = [];
  let ruleFormMode = RULE_FORM_MODES.add;
  let editingDomain = "";

  const resetRuleEditor = ({ clearDomainInput = true } = {}) => {
    ruleFormMode = RULE_FORM_MODES.add;
    editingDomain = "";
    addSiteRuleButtonOptions.textContent = "Add Rule";
    cancelSiteRuleEditButton.hidden = true;
    if (clearDomainInput) {
      siteDomainInput.value = "";
    }
  };

  const startRuleEdit = (domain, rule) => {
    ruleFormMode = RULE_FORM_MODES.edit;
    editingDomain = domain;
    siteDomainInput.value = domain;
    siteProxySelect.value = rule.type === "PROXY_BY_RULE" ? rule.proxyName : rule.type;
    addSiteRuleButtonOptions.textContent = "Save Rule";
    cancelSiteRuleEditButton.hidden = false;
    siteDomainInput.focus();
    siteDomainInput.select();
  };

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
        siteRules[domain] = createSiteRuleFromSetting(newSetting);
        await storage.setSiteRules(siteRules);
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        refreshStatus();
      });

      proxyCell.appendChild(select);

      const actionsCell = row.insertCell();
      const actionsGroup = document.createElement("div");
      actionsGroup.classList.add("rule-actions");

      const editButton = document.createElement("button");
      editButton.textContent = "✏";
      editButton.classList.add("edit-button", "icon-button");
      editButton.title = "Edit rule";
      editButton.setAttribute("aria-label", `Edit rule for ${domain}`);
      editButton.addEventListener("click", () => {
        startRuleEdit(domain, rule);
      });
      actionsGroup.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-button");
      deleteButton.addEventListener("click", async () => {
        delete siteRules[domain];
        await storage.setSiteRules(siteRules);
        if (editingDomain === domain) {
          resetRuleEditor();
        }
        renderSiteRules();
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        refreshStatus();
      });
      actionsGroup.appendChild(deleteButton);

      actionsCell.appendChild(actionsGroup);
    }
  };

  // --- Add/edit rule ---
  addSiteRuleButtonOptions.addEventListener("click", async () => {
    const domain = normalizeSiteRuleDomain(siteDomainInput.value);
    const selectedProxySetting = siteProxySelect.value;

    if (domain) {
      const existingRules = await storage.getSiteRules();
      const duplicateDomain = findDuplicateSiteRuleDomain(
        existingRules,
        domain,
        ruleFormMode === RULE_FORM_MODES.edit ? editingDomain : ""
      );

      if (duplicateDomain) {
        const shouldReplace = confirm(
          `A rule for domain "${duplicateDomain}" already exists.\n\nClick OK to replace it, or Cancel to keep the existing rule.`
        );
        if (!shouldReplace) {
          return;
        }
      }

      const nextRules = prepareSiteRulesForSave(existingRules, {
        domain,
        editingDomain,
        duplicateDomain,
      });
      nextRules[domain] = createSiteRuleFromSetting(selectedProxySetting);

      await storage.setSiteRules(nextRules);
      resetRuleEditor();
      renderSiteRules();
      chrome.runtime.sendMessage({ action: "updateProxySettings" });
      refreshStatus();
    }
  });

  cancelSiteRuleEditButton.addEventListener("click", () => {
    resetRuleEditor();
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
          const conflicts = findImportSiteRuleConflicts(existingRules, importedRules);
          let duplicateStrategy = IMPORT_DUPLICATE_STRATEGIES.replace;

          if (conflicts.length > 0) {
            const shouldReplace = confirm(
              `${conflicts.length} imported site rule(s) already exist.\n\nClick OK to replace duplicates with imported values, or Cancel to skip duplicate imports and keep existing rules.`
            );
            duplicateStrategy = shouldReplace
              ? IMPORT_DUPLICATE_STRATEGIES.replace
              : IMPORT_DUPLICATE_STRATEGIES.skip;
          }

          const proxies = await storage.getProxies();
          const { mergedRules, stats } = mergeImportedSiteRules(
            existingRules,
            importedRules,
            duplicateStrategy,
            proxies.map((proxy) => proxy.name)
          );

          await storage.setSiteRules(mergedRules);
          renderSiteRules();
          chrome.runtime.sendMessage({ action: "updateProxySettings" });
          refreshStatus();
          alert(
            `Site rules import complete. Added: ${stats.added}, Replaced: ${stats.replaced}, Skipped: ${stats.skipped} (missing proxy: ${stats.skippedMissingProxy}, invalid format: ${stats.skippedInvalid}).`
          );
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
    resetRuleEditor,
    getSiteDomainInput: () => siteDomainInput,
    getSiteProxySelect: () => siteProxySelect,
    getAddSiteRuleButton: () => addSiteRuleButtonOptions,
  };
}
