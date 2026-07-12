# Proxy Manager Extension

<p align="center">
  <img src="./extension/icon48.png" width="120" alt="icon"/>
</p>

A lightweight browser extension for flexible proxy control. It lets you manage global proxy settings, define per-site behavior, and maintain your own list of proxies with authentication support. The popup UI gives instant visibility into which proxy rule applies to the current page.

---

## ✨ Features

### Global Proxy Mode

Enable a single proxy for all traffic. Supports HTTP, HTTPS, SOCKS4, and SOCKS5.

### Per-Site Rules

Assign specific routing for any domain:

- **NO_PROXY** — always direct
- **RANDOM_PROXY** — deterministic selection based on hostname
- **PROXY_BY_RULE** — fixed proxy by name
- **DIRECT (Temporary)** — bypass proxy until toggled off

### Page-Level Direct Mode

Temporarily disable proxying for the active tab’s domain.

### Proxy Management

Add and store your proxies, including optional credentials, protocol, and country label. All proxies are editable and removable.

### Import/Export

Backup or restore proxy lists and site rules in JSON format.
See `examples/README.md` for example files and import guidance.

### Debug Logging

Toggle detailed debugging output for background proxy logic.

---

## 💻 Technical Stack

- Manifest V3
- JavaScript ES Modules
- Chrome Proxy API
- chrome.storage.sync
- PAC script generation for rule-based proxying
- Background service worker for routing logic
- Popup UI built with HTML/CSS/JS

---

## 🔧 Installation

1. Download or clone the project.
2. Open **chrome://extensions/**.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project root folder (this repo).

---

## 🛠️ Development

Run a seeded browser profile for manual popup checks:

```bash
npm run dev:seeded
```

The command creates an isolated temporary Chrome/Chromium profile, loads a temporary copy of the unpacked extension, and seeds deterministic proxy/rule data into `chrome.storage.sync`. Use `CHROME_PATH=/path/to/chrome npm run dev:seeded` or `npm run dev:seeded -- --browser /path/to/chrome` if Chrome is not auto-detected.

Seed and import-test fixtures live in `examples/dev/`.

Run browser-level extension e2e checks:

```bash
npm run e2e:extension
```

The e2e runner launches an isolated Chrome/Chromium profile, loads this repo as an unpacked extension, drives the popup through Chrome DevTools Protocol, and verifies proxy import duplicate replace/skip/error flows against `chrome.storage.sync`. Use `CHROME_PATH=/path/to/chrome npm run e2e:extension` or `npm run e2e:extension -- --browser /path/to/chrome` when the default browser cannot load unpacked extensions from command-line flags.

---

## 🔩 Usage Overview

1. **Add proxies** in the _Proxies_ tab.
2. **Enable global mode** and select your preferred proxy.
3. **Create per-site rules** in the _Site Rules_ tab or use _Add rule for this site_.
4. **Use the temporary direct toggle** to bypass proxying for the current domain.
5. **Enable logging** via the small toggle button in the popup header.

---

## 🧩 How Decisions Are Made

Proxy behavior follows this priority:

1. Temporary direct override
2. Most specific site rule
3. Global proxy
4. Direct connection

Advanced rules trigger automatic PAC script generation.

---
