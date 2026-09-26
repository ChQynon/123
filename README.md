# adaption — Школьный дневник НИШ

[![Build Desktop Apps](https://github.com/ChQynon/123/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/ChQynon/123/actions/workflows/build-desktop.yml)
[![Build Mobile Apps](https://github.com/ChQynon/123/actions/workflows/build-mobile.yml/badge.svg)](https://github.com/ChQynon/123/actions/workflows/build-mobile.yml)

Современная кроссплатформенная экосистема для учащихся и родителей НИШ:
- Журнал оценок и четвертные баллы
- Интерактивный калькулятор оценок и симулятор СОР / СОЧ
- Табель и отчёты успеваемости
- Расписание уроков (EduPage + официальный сервис)
- Поддержка платформ: **Веб**, **Android**, **iOS**, **Windows (ПК)**, **macOS (Mac)**

---

## Контакты и Социальные Сети

- 📱 **Telegram разработчиков / Канал**: [@academia_nis](https://t.me/academia_nis)
- 🌐 **Официальный веб-сайт**: [adaption.top](https://adaption.top)
- ☕ **Поддержать проект (DonationAlerts)**: [donationalerts.com/r/alyxmp4](https://www.donationalerts.com/r/alyxmp4)
- 💻 **Репозиторий проекта**: [github.com/ChQynon/123](https://github.com/ChQynon/123)

---

## Архитектура приложений

```
adaption/
├── src/                  # Веб-версия (Next.js 14 App Router, Tailwind CSS)
│   ├── app/              # Маршруты страниц (dash, calculator, schedule, reports, settings)
│   ├── widgets/pin/      # Логика защиты: PinGate, PinLock, PinSetup, PinSettings, PinInput
│   └── lib/pin/          # Платформенный мост (isApp, supportsBiometric) и SHA-256 криптография
├── apps/
│   ├── mobile/           # Мобильное приложение (React Native / Expo SDK 51)
│   │   ├── app/          # Экраны (auth/login, auth/pin-setup, lock, app/webview)
│   │   └── eas.json      # Конфигурация облачной сборки EAS (Android APK + iOS IPA)
│   └── desktop/          # Десктопное приложение (Electron 30)
│       ├── main.js       # Главный процесс, биометрия Touch ID / Windows Hello, системные окна
│       └── preload.js    # Безопасный IPC-мост между Electron и веб-контекстом
└── .github/workflows/    # Автоматическая сборка в облаке GitHub Actions
    ├── build-desktop.yml # Сборка Windows (.exe), macOS (.dmg) и Linux (.AppImage)
    └── build-mobile.yml  # Сборка Android (.apk) и iOS (.ipa)
```

---

## Безопасность: ПИН-код и Face ID

1. **Разграничение Веб и Приложений**:
   - В **веб-версии** (`adaption.top` в браузере) вход осуществляется по логину (ИИН) и паролю СУШ. Настройки ПИН-кода и Face ID в веб-версии **не отображаются**.
   - В **версиях приложений** (Android, iOS, ПК, Mac) доступна полноценная биометрическая защита.

2. **Первый запуск приложения**:
   - После успешного входа по логину/паролю приложение предлагает придумать **4- или 6-значный ПИН-код**.
   - ПИН-код хэшируется по алгоритму SHA-256 с уникальной случайной солью и сохраняется в защищённом хранилище (`SecureStore` на мобильных, зашифрованный профиль на десктопе).

3. **Последующие запуски**:
   - Приложение **не требует заново вводить ИИН и пароль**.
   - Отображается экран блокировки с предложением ввести ПИН-код или подтвердить личность через **Face ID / Touch ID / Windows Hello**.
   - До ввода верного ПИН-кода или подтверждения биометрии **доступ к данным аккаунта заблокирован**.
   - При 5 неверных попытках ввода сессия автоматически аннулируется в целях безопасности.

4. **Управление в настройках**:
   - В настройках приложения доступна смена ПИН-кода (с предварительной проверкой старого).
   - Возможность включения/выключения Face ID / биометрического входа.
   - Удаление ПИН-кода.

---

## Автоматическая сборка (GitHub Actions)

В репозитории настроены CI/CD сценарии:

- **Десктоп (ПК и Mac)**: запускается автоматически при создании тега `v*` (например, `v1.0.0`) или вручную во вкладке **Actions** → **Build Desktop Apps**. Формирует готовые установщики для Windows, macOS и Linux.
- **Мобильные (Android и iOS)**: запускается по тегу или вручную во вкладке **Actions** → **Build Mobile Apps**. Формирует файлы APK для Android и IPA для iOS через EAS.

---

## Лицензия и Разработка

Разработано для сообщества учащихся и родителей НИШ.  
Связь с разработчиками: Telegram [@academia_nis](https://t.me/academia_nis).
