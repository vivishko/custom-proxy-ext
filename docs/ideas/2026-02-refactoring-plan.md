# План рефакторинга

Дата: 2026-02-12

Полный план рефакторинга кодовой базы расширения на основе ревью
extension/background.js (679 строк), extension/popup.js (869 строк), extension/utils.js (89 строк),
extension/strings.js (37 строк).

---

## Фаза 1: Быстрые победы (низкий риск)

### 1. Консистентное использование `STORAGE_KEYS`

`extension/popup.js` в ~10 местах использует сырые строки (`"proxies"`, `"siteRules"`,
`"globalProxyEnabled"`) вместо констант из `extension/utils.js`. Это бомба замедленного
действия -- если ключ переименуется, часть ссылок сломается.

**Действие:** заменить все raw-строки на `STORAGE_KEYS.*`.

### 2. Вынести магические числа в константы

- `setTimeout(checkCurrentProxySettings, 1000)` -- 6 раз в extension/background.js
- Debounce 100ms для applyProxySettings (extension/background.js строка 392)
- Retry interval 100ms x 10 попыток в getCurrentTabInfo (extension/popup.js)

**Действие:** создать объект `TIMEOUTS` в `extension/utils.js`.

### 3. Убрать мёртвый код и ресурсы

- `manifest.json` ссылается на `tabs.js` -- файла нет
- Разрешение `notifications` не используется
- `extension/icon48.png` весит 1.5 MB для иконки 48x48

### 4. Перенести inline-стили из `extension/popup.html` в `extension/popup.css`

Строки 6-65 в `extension/popup.html` содержат `<style>` блок для logging toggle.
Остальные стили живут в `extension/popup.css`. Надо консолидировать.

---

## Фаза 2: Декомпозиция extension/popup.js (главный рефакторинг)

`extension/popup.js` -- 869 строк в одном замыкании `DOMContentLoaded`. Невозможно
тестировать, всё связано через замыкание.

### Предлагаемая структура

```
popup/
  extension/popup.js          -- точка входа, инициализация, маршрутизация экранов
  storage.js        -- абстракция над chrome.storage.sync (get/set обёртки)
  ui-render.js      -- функции рендеринга (dropdown-ы, таблицы, статус)
  proxy-controls.js -- обработчики toggle/select (global, per-page)
  site-rules.js     -- CRUD для site rules + импорт/экспорт
  proxy-crud.js     -- CRUD для прокси + импорт/экспорт
  validation.js     -- валидация форм (сейчас inline в submit-хендлере)
```

### Ключевые шаги

1. **Выделить `storage.js`** -- обёртка над `chrome.storage.sync` с
   типизированными методами (`getProxies()`, `setSiteRules()` и т.д.).
   Убирает дублирование ключей, даёт единую точку доступа.
2. **Выделить `ui-render.js`** -- построение dropdown-ов повторяется 3 раза
   в разных местах (loadMainControls, loadProxiesForDropdown, renderSiteRules).
   Одна функция `buildProxyOptions(proxies)`.
3. **Разделить по экранам** -- каждый screen (main, rules, proxies, addProxy)
   получает свой модуль с обработчиками.

---

## Фаза 3: Декомпозиция extension/background.js

`extension/background.js` -- 679 строк. Главная проблема -- `applyProxySettings()` на
198 строк, `onAuthRequired` на 136 строк.

### Предлагаемая структура

```
background/
  extension/background.js      -- точка входа, listeners, message router
  pac-builder.js     -- buildPacScript() + вспомогательные функции
  proxy-modes.js     -- 4 стратегии применения прокси
  auth-handler.js    -- onAuthRequired (136 строк -> отдельный модуль)
  tab-tracker.js     -- управление temporaryProxySites/temporaryDirectSites
                        при закрытии табов
```

### Ключевые шаги

1. **Разбить `applyProxySettings()`** на 4 функции по режимам:
   `applyPacPerSite()`, `applyFixedServers()`, `applyPacComplexRules()`,
   `applyDirect()`. Основная функция только выбирает стратегию.
2. **Выделить `auth-handler.js`** -- 136 строк auth-логики это
   самостоятельный модуль.
3. **Выделить `pac-builder.js`** -- PAC-скрипт генерируется строками,
   это отдельная ответственность.

---

## Фаза 4: Общий storage-слой

Сейчас `extension/popup.js` и `extension/background.js` оба напрямую читают/пишут в
`chrome.storage.sync`. Это два канала связи (messages + shared storage).

**Действие:** создать общий `storage.js` модуль, импортируемый обеими сторонами.

Плюсы:
- Централизованная валидация данных
- Нет дублирования ключей
- Проще миграция структуры данных

---

## Фаза 5: Тестируемость

Сейчас тестов ноль. После декомпозиции можно тестировать:

- `pac-builder.js` -- чистая функция, принимает данные, возвращает строку PAC
- `validation.js` -- чистые функции валидации
- `storage.js` -- можно мокать `chrome.storage`
- `findMostSpecificRule`, `endsWithDomain`, `chooseDeterministicProxy` --
  уже тестируемы из extension/utils.js

---

## Приоритет и трудозатраты

| Фаза | Риск    | Усилия    | Ценность |
|------|---------|-----------|----------|
| 1    | Низкий  | 1-2 часа  | Средняя  |
| 2    | Средний | 4-6 часов | Высокая  |
| 3    | Средний | 3-4 часа  | Высокая  |
| 4    | Низкий  | 2-3 часа  | Средняя  |
| 5    | Низкий  | 3-4 часа  | Высокая  |

Рекомендуемый порядок: фаза 1 (безопасно), потом фаза 2 (самый большой файл),
потом фаза 3 (background), потом фаза 4 (storage), и в конце фаза 5 (тесты,
когда код уже модульный).

---

## Выявленные code smells

- **extension/popup.js god file** -- 869 строк, одно замыкание, нет экспортов
- **applyProxySettings() god function** -- 198 строк, 4 режима в одной функции
- **onAuthRequired** -- 136 строк монолит с захардкоженным jivosite.com bypass
- **Дублирование построения dropdown-ов** -- 3 места в extension/popup.js
- **Непоследовательное использование storage-ключей** -- STORAGE_KEYS vs
  сырые строки в extension/popup.js
- **Смешанные async-паттерны** -- колбэки и async/await в одной функции
  (extension/background.js)
- **Нет обработки ошибок** -- валидация inline, используется alert()
- **Дублирование domain-matching** -- endsWithDomain в extension/utils.js и внутри
  PAC-строки (дублирование в PAC необходимо из-за песочницы, но есть риск
  расхождения логики)
