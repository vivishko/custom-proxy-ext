# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Support for proxy groups with load balancing and fallback sequences.
- Option to test proxy connectivity directly from the popup interface.
- UI indicators showing real-time proxy health or last success timestamp.
- Rule presets for common domains (e.g., Google, AWS, social networks).
- Quick toggle button in the toolbar for instant global proxy on/off.

### Changed

- Improved domain parsing to support IDN (internationalized) domains.
- Refined UI layout for better readability on smaller screens.

### Fixed

- More reliable detection of active tab URL on slow-loading pages.
- Edge cases where PAC script could generate redundant rules.

### Security

- Encrypted storage for proxy passwords using Chrome's platform APIs.

---

## [1.1.1] - 2025-11-17

### Changed

- Ability to enable logging functionality for debugging issues

---

## [1.1.0] - 2025-11-14

### Added

- Proxy
  - Manually add and remove proxy settings
  - Export and import proxy list data
- Global behavior
  - Enable global proxying for all browser requests and select a specific proxy option
  - Enable proxying only for requests on a single specific site
- Rules
  - Assign specific behavior to a domain
    - _\<proxy-name\>_ – always use the specified proxy from the list when connecting to the site
    - _DIRECT_ – direct connection
    - _RANDOM_PROXY_ – always use a random proxy from the existing list when connecting to the site
  - Add, edit, and delete a rule
  - Set from global behavior

[unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0...v1.1.0
