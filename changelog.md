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

- Возможность включения функционала логирования для дебаггинга проблем

---

## [1.1.0] - 2025-11-14

### Added

Прокси

- Добавление и удаление настроек прокси вручную
- Экспорт и импорт данных списка прокси

Глобальное поведение

- Включить глобальное проксирование для всех запросов в браузере + выбор конкретного варианта прокси
- Включить проксирование запросов только на одном конкретном сайте

Правила

- Фиксирование определенного поведения за доменом
  - _\<proxy-name\>_ - при подключении к сайту всегда используется конкретный заданный прокси из списка
  - _DIRECT_ - прямое подключение
  - _RANDOM_PROXY_ - при подключении к сайту всегда используется рандомный прокси из списка существующих
- Добавить, изменить и удалить правило
- Задать из глобального поведения

[unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0...v1.1.0
