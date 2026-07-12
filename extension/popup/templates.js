function renderHeader() {
  return `
    <div class="header-bar">
      <h1>Proxy Control</h1>
    </div>
  `;
}

function renderMainScreen() {
  return `
    <div id="mainScreen" class="screen active">
      <div class="status-display" id="proxyStatusDisplay"></div>

      <div class="control-group" data-control-group="global">
        <label id="proxyToggleLabel" for="proxyToggle">Global proxy</label>
        <label class="toggle-switch" for="proxyToggle">
          <input type="checkbox" id="proxyToggle" />
          <span class="toggle-slider" aria-hidden="true"></span>
        </label>
        <select id="proxySelect" disabled></select>
      </div>

      <div class="control-group" data-control-group="page">
        <div class="control-label-with-info">
          <label id="pageProxyToggleLabel" for="pageProxyToggle">
            Only this page
          </label>
          <span
            id="pageProxyInfoIcon"
            class="info-icon"
            role="img"
            tabindex="0"
            aria-label="Only this page info"
            title="Only this page applies only to this domain; Global still applies elsewhere."
          >i</span>
        </div>
        <label class="toggle-switch" for="pageProxyToggle">
          <input type="checkbox" id="pageProxyToggle" disabled />
          <span class="toggle-slider" aria-hidden="true"></span>
        </label>
        <select id="pageProxySelect" disabled></select>
      </div>
      <div id="proxyModeHint" class="control-hint" aria-live="polite"></div>

      <button id="addRuleButtonMain" data-add-rule>
        Add rule for this site
      </button>

      <div class="screen-actions">
        <button class="nav-button" data-screen-target="proxiesScreen">
          Proxies
        </button>
        <button class="nav-button" data-screen-target="rulesScreen">
          Rules
        </button>
        <button class="nav-button" data-screen-target="settingsScreen">
          Settings
        </button>
      </div>
    </div>
  `;
}

function renderRulesScreen() {
  return `
    <div id="rulesScreen" class="screen">
      <div class="screen-header">
        <button class="back-button" data-screen-target="mainScreen">
          Back
        </button>
        <h2>Rules</h2>
        <span class="screen-header-spacer"></span>
      </div>

      <div class="site-rule-form">
        <input
          type="text"
          id="siteDomainInput"
          placeholder="Domain (e.g., example.com)"
        />
        <select id="siteProxySelect">
          <option value="NO_PROXY">NO_PROXY</option>
          <option value="RANDOM_PROXY">RANDOM_PROXY</option>
          <option value="DIRECT_TEMPORARY">DIRECT (Temporary)</option>
        </select>
        <button id="addSiteRuleButtonOptions">Add Rule</button>
        <button id="cancelSiteRuleEditButton" type="button" hidden>
          Cancel
        </button>
      </div>

      <div class="table-controls">
        <div class="table-search">
          <label for="siteRulesSearchInput">Search rules</label>
          <input
            type="search"
            id="siteRulesSearchInput"
            placeholder="Domain, rule type, or proxy"
            autocomplete="off"
          />
        </div>
        <div class="table-filter">
          <label for="siteRulesFilterSelect">Filter</label>
          <select id="siteRulesFilterSelect">
            <option value="all">All rules</option>
            <option value="proxy">Proxy rules</option>
            <option value="no_proxy">NO_PROXY</option>
            <option value="random_proxy">RANDOM_PROXY</option>
            <option value="direct_temporary">DIRECT temporary</option>
          </select>
        </div>
        <div class="table-filter">
          <label for="siteRulesSortSelect">Sort</label>
          <select id="siteRulesSortSelect">
            <option value="storage_order">Default</option>
            <option value="recent_first">Recently added</option>
            <option value="domain_asc">Domain A-Z</option>
            <option value="domain_desc">Domain Z-A</option>
          </select>
        </div>
      </div>

      <table id="siteRulesTable">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Proxy Setting</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <div class="table-pagination" id="siteRulesPagination">
        <button id="siteRulesPrevPageButton" type="button">Previous</button>
        <span id="siteRulesPageLabel" aria-live="polite">Page 1 of 1</span>
        <button id="siteRulesNextPageButton" type="button">Next</button>
      </div>
      <div class="export-import">
        <button id="exportSiteRulesButton">Export Site Rules</button>
        <input
          type="file"
          id="importSiteRulesFile"
          accept=".json"
          class="hidden-file-input"
        />
        <button id="importSiteRulesButton">Import Site Rules</button>
      </div>
    </div>
  `;
}

function renderProxiesScreen() {
  return `
    <div id="proxiesScreen" class="screen">
      <div class="screen-header">
        <button class="back-button" data-screen-target="mainScreen">
          Back
        </button>
        <h2>Proxies</h2>
        <span class="screen-header-spacer"></span>
      </div>

      <div id="proxiesFeedback" class="screen-feedback" aria-live="polite"></div>

      <button
        id="openAddProxyScreen"
        class="primary-action"
        data-screen-target="addProxyScreen"
      >
        + Add Proxy
      </button>

      <h3>Available Proxies</h3>
      <table id="proxiesTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Host:Port</th>
            <th>Country</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <div class="table-pagination" id="proxiesPagination">
        <button id="proxiesPrevPageButton" type="button">Previous</button>
        <span id="proxiesPageLabel" aria-live="polite">Page 1 of 1</span>
        <button id="proxiesNextPageButton" type="button">Next</button>
      </div>
      <div class="export-import">
        <button id="exportProxiesButton">Export Proxies</button>
        <input
          type="file"
          id="importProxiesFile"
          accept=".json"
          class="hidden-file-input"
        />
        <button id="importProxiesButton">Import Proxies</button>
      </div>
    </div>
  `;
}

function renderAddProxyScreen() {
  return `
    <div id="addProxyScreen" class="screen">
      <div class="screen-header">
        <button class="back-button" data-screen-target="proxiesScreen">
          Back
        </button>
        <h2>Add Proxy</h2>
        <span class="screen-header-spacer"></span>
      </div>

      <form id="addProxyForm">
        <div class="form-group">
          <label for="proxyName">Proxy Name:</label>
          <input type="text" id="proxyName" required />
        </div>
        <div class="form-group">
          <label for="proxyHost">Host:</label>
          <input
            type="text"
            id="proxyHost"
            placeholder="e.g., 127.0.0.1"
            required
          />
        </div>
        <div class="form-group">
          <label for="proxyPort">Port:</label>
          <input
            type="number"
            id="proxyPort"
            placeholder="e.g., 8080"
            required
          />
        </div>
        <div class="form-group">
          <label for="proxyUsername">Username (optional):</label>
          <input type="text" id="proxyUsername" />
        </div>
        <div class="form-group">
          <label for="proxyPassword">Password (optional):</label>
          <input type="password" id="proxyPassword" />
        </div>
        <div class="form-group">
          <label for="proxyCountry">Country:</label>
          <input type="text" id="proxyCountry" required />
        </div>
        <div class="form-group">
          <label for="proxyProtocol">Protocol:</label>
          <select id="proxyProtocol" required>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>
        <button type="submit">Save Proxy</button>
      </form>
    </div>
  `;
}

function renderSettingsScreen() {
  return `
    <div id="settingsScreen" class="screen">
      <div class="screen-header">
        <button class="back-button" data-screen-target="mainScreen">
          Back
        </button>
        <h2>Settings</h2>
        <span class="screen-header-spacer"></span>
      </div>

      <div class="settings-list">
        <div class="settings-row">
          <div>
            <h3>Debug logging</h3>
            <p>Write diagnostic messages for popup and background flows.</p>
          </div>
          <button
            id="loggingToggle"
            class="settings-toggle-button"
            type="button"
            aria-pressed="false"
          >
            Off
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderPopupShell(rootElement) {
  if (!rootElement) {
    throw new Error("Popup root element is missing.");
  }

  rootElement.innerHTML = [
    renderHeader(),
    renderMainScreen(),
    renderRulesScreen(),
    renderProxiesScreen(),
    renderAddProxyScreen(),
    renderSettingsScreen(),
  ].join("");
}
