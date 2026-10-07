# Приложения adaption

## Архитектура

Все пользовательские страницы находятся в `../src/`. Оболочки загружают
актуальный сайт `https://adaption.top`, включая авторизацию, ПИН и настройки.
Обновление опубликованного сайта обновляет интерфейс всех приложений при
следующей загрузке. Отдельных нативных копий дизайна нет.

- `mobile/`: Expo SDK 51, React Native WebView, Android и iOS.
- `desktop/`: Electron, Windows и macOS, также сборка Linux.
- Нативные мосты: цвет системных областей окна, биометрия, сохранение ПИН.
- Настройка темы принадлежит сайту; оболочки не принуждают тёмную тему.

При запуске приложения выбирается системная тема, а мобильная версия делает
это также при возвращении из фона. Сайт получает актуальный цвет устройства
через мост; ручной выбор темы в настройках действует до следующего входа.
Первый запуск ограничен 20 секундами с возможностью повторить; переходы между
разделами не перекрываются экраном загрузки. Чтение SecureStore и IndexedDB
не может бесконечно задерживать отображение страницы.

## Android и iOS

```sh
cd apps/mobile
npm ci
npm run typecheck
npx expo start
```

Для проверки локального сайта задайте `EXPO_PUBLIC_APP_URL` перед запуском
Expo (на физическом телефоне используйте доступный адрес компьютера).
По умолчанию оболочка всегда открывает производственный сайт.

Проверка JS-пакетов обеих платформ без Android SDK / Xcode:

```sh
npx expo export --platform android --platform ios --output-dir dist/bundle
```

Локальная сборка Android требует JDK 17 и Android SDK:

```sh
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

Для облачных подписанных сборок настройте проект Expo/EAS, замените
`YOUR_EAS_PROJECT_ID` в `app.json` на реальный ID и настройте ключи подписи:

```sh
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Для установки на обычный iPhone нужна подписанная сборка и профиль Apple.
Локальная сборка iOS требует macOS / Xcode. Архив симулятора и неподписанный
IPA из GitHub Actions не являются готовой подписанной сборкой для iPhone.

## Windows и macOS

```sh
cd apps/desktop
npm ci
npm run dev
npm run build:win
npm run build:mac
```

Выходные файлы: `apps/desktop/dist/` — установщик и portable EXE для Windows,
DMG и ZIP для macOS. Сборку Mac запускайте на macOS; для распространения
без предупреждений системы нужны Apple Developer, подпись и нотариализация.
Для локального сайта перед запуском задайте `ELECTRON_START_URL`.

## Защита устройства

Экран ПИН общий с сайтом, отображается только внутри приложений.
Мобильные версии вызывают Expo LocalAuthentication (Face ID / отпечаток);
Mac вызывает настоящий Touch ID. При отсутствии биометрии используется ПИН.
Windows Hello пока не реализован: оболочка возвращает `success: false`,
а не разблокирует аккаунт без проверки. При выходе очищается защита
предыдущего аккаунта, при сворачивании снова показывается экран блокировки.

## Автоматическая сборка

`.github/workflows/release-apps.yml` запускается по тегу `v*` или вручную.
Собирает Windows EXE, macOS DMG/ZIP для Intel и Apple Silicon, Android APK,
iOS unsigned IPA и архив симулятора. После успешных сборок и проверок
публикует все файлы и SHA-256 суммы в одном GitHub Release.

Перед выпуском обновите версии в `apps/mobile/package.json`,
`apps/mobile/app.json` и `apps/desktop/package.json`, а также lock-файлы,
`android.versionCode` и `ios.buildNumber`. Тег должен совпадать с версией:
например, `v1.0.2`. Заметки для релиза — в `docs/release-notes.md`.

При изменениях только страниц сайта пересборка оболочек не нужна.
