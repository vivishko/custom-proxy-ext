## What’s inside

This folder contains example configurations for the extension. They show how to define a proxy server and how to set rules for domains/hosts.

## Files

- `ru_residence_german_proxy.json` — example proxy server definition (e.g., a German exit IP). Import this in the Proxy import section.
- `ru_residence_german_proxy_rules.json` — example rules where some traffic goes through the proxy and the rest goes direct. Import this in the Rules import section.
- `ru_residence_no_proxy_rules.json` — example rules for no‑proxy mode (all direct), useful as a base template. Import this in the Rules import section.
- `dev/seeded-proxies.json` — deterministic proxy seed data used by `npm run dev:seeded`.
- `dev/seeded-site-rules.json` — deterministic site-rule seed data used by `npm run dev:seeded`.
- `dev/import-proxies-duplicate-replace-skip.json` — proxy import fixture that conflicts with seeded data, useful for replace/skip checks.
- `dev/import-proxies-duplicate-error.json` — proxy import fixture with case-insensitive duplicates inside one file, useful for validation-error checks.

## How to apply

1. Pick the right JSON type (proxy vs rules) or use it as a template.
2. Fill in your values (host, port, username/password, domain list).
3. Import the proxy file via Proxy import, and the rules file via Rules import in the extension settings.
