# Adaption — Платформа и Приложения (Android, iOS, ПК, Mac, Веб)

Монорепозиторий экосистемы **adaption** (Школьный дневник НИШ):
- **Веб-версия** (`src/`) — Next.js 14, развёрнута на [adaption.top](https://adaption.top)
- **Мобильное приложение** (`apps/mobile/`) — React Native (Expo SDK 51) для **Android** (APK/AAB) и **iOS** (IPA)
- **Десктопное приложение** (`apps/desktop/`) — Electron 30 для **Windows (ПК)**, **macOS (Mac)** и **Linux**

---

## Контакты, Социальные Сети и Поддержка

- **Telegram разработчиков / Сообщество**: [@academia_nis](https://t.me/academia_nis)
- **Официальный сайт**: [adaption.top](https://adaption.top)
- **Репозиторий проекта**: [github.com/ChQynon/123](https://github.com/ChQynon/123)
- **Поддержать разработчиков (DonationAlerts)**: [donationalerts.com/r/alyxmp4](https://www.donationalerts.com/r/alyxmp4)

---

## Архитектура защиты: ПИН-код и Face ID / Биометрия

### Разделение по версиям (Строгое разграничение)

1. **Веб-версия (браузеры: Chrome, Safari, Firefox и др.)**:
   - Авторизация стандартная: по ИИН и паролю СУШ.
   - **Установка и изменение ПИН-кода/пароля в веб-версии НЕ отображаются** (`isApp() === false`).
   - Веб-пользователи не видят лишних настроек блокировки устройства.

2. **Версии приложений (Мобильные Android / iOS и Десктоп ПК / Mac)**:
   - **Первый вход**: После успешной авторизации по ИИН и паролю пользователю предлагается создать **4- или 6-значный ПИН-код**.
   - **Последующие запуски**: Приложение **НЕ требует вводить ИИН и пароль с нуля**. Вместо этого сразу открывается замок ввода ПИН-кода или запрос **Face ID / Touch ID / Windows Hello**.
   - **Блокировка доступа**: До тех пор, пока ПИН-код не введён корректно или биометрия не подтверждена, **доступ к аккаунту и данным полностью заблокирован** (`PinGate` / `PinLock`).
   - **Защита от подбора**: После 5 неудачных попыток ввода ПИН-кода сессия сбрасывается и инициируется полный выход из аккаунта.
   - **Настройки внутри приложений**:
     - В разделе «Настройки» отображается блок **«ПИН-код»** и **«Face ID / Биометрия»**.
     - Пользователь может **изменить ПИН-код** (введя текущий, выбрав новую длину 4/6 и подтвердив).
     - Пользователь может **включить/выключить Face ID** для мгновенной биометрической разблокировки при входе.
     - Пользователь может удалить ПИН-код.

---

## Быстрый старт

### 1. Веб-версия (Next.js)
```bash
pnpm install
pnpm dev
```
Открыть в браузере: `http://localhost:3000`

### 2. Мобильное приложение (Expo / React Native)
```bash
cd apps/mobile
npm install
npx expo start
```
- Для запуска на **Android** (эмулятор или устройство): нажмите `a` или запустите `npm run android`
- Для запуска на **iOS** (симулятор): нажмите `i` или запустите `npm run ios`

### 3. Десктопное приложение (Electron: Windows / Mac / Linux)
```bash
cd apps/desktop
npm install
npm run dev
```

---

## Сборка релизов (Build)

### Десктопные приложения (Electron Builder)

```bash
cd apps/desktop
npm install

# Для Windows (ПК): создаёт инсталлятор .exe (NSIS) и портативную версию
npm run build:win

# Для macOS (Mac): создаёт DMG-образ и ZIP для Apple Silicon / Intel
npm run build:mac

# Для Linux: создаёт универсальный .AppImage
npm run build:linux
```
Собранные файлы сохраняются в `apps/desktop/dist/`.

### Мобильные приложения (EAS Build)

```bash
cd apps/mobile
npm install

# Сборка Android APK для прямой установки:
npx eas build --platform android --profile production

# Сборка iOS IPA:
npx eas build --platform ios --profile production
```

---

## Сборка через GitHub Actions (CI/CD)

В репозитории настроены автоматические сценарии сборки в `.github/workflows/`:

1. **`.github/workflows/build-desktop.yml`** — Сборка под ПК и Mac:
   - Собирает установщики под **Windows** (`.exe`, `.msi`), **macOS** (`.dmg`, `.zip`) и **Linux** (`.AppImage`).
   - Автоматически создаёт релиз на GitHub при пуше тега версии (`git tag v1.0.0 && git push origin v1.0.0`).
   - Можно запускать вручную через вкладку **Actions** → **Build Desktop Apps** (выбрав платформу `all`, `windows`, `macos` или `linux`).

2. **`.github/workflows/build-mobile.yml`** — Сборка под Android и iOS:
   - Собирает **Android APK** и **iOS IPA** через EAS.
   - Публикует заметки о релизе с ссылками на каналы и сайт.
   - Запускается по тегу `v*` или вручную через **Actions** → **Build Mobile Apps**.

### Настройка секретов в GitHub
В настройках вашего репозитория на GitHub (**Settings** → **Secrets and variables** → **Actions**) добавьте:

- `EXPO_TOKEN` — токен с [expo.dev](https://expo.dev/settings/access-tokens) для облачной сборки мобильных приложений
- `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD` *(опционально)* — сертификат цифровой подписи Windows
- `MACOS_CERTIFICATE` / `MACOS_CERTIFICATE_PASSWORD` *(опционально)* — сертификат Apple Developer
- `GITHUB_TOKEN` — предоставляется GitHub автоматически для создания релизов

---

## Разработчики и сообщество

- **Telegram**: [@academia_nis](https://t.me/academia_nis)
- **Сайт**: [adaption.top](https://adaption.top)
- **GitHub**: [github.com/ChQynon/123](https://github.com/ChQynon/123)