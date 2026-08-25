примени данный стиль к  сайту и исправь ошибки # Monocode Desktop — Design System: Анимации

> Полная инвентаризация всех анимационных механизмов фронтенда приложения (Tauri + React + Tailwind v4).
> Охват: `src/`, `index.html`, `public/`, `package.json`. Отдельный субпроект `agent/` описан в конце.

---

## Содержание

1. [Философия и обзор системы](#1-философия-и-обзор-системы)
2. [Архитектура стилей](#2-архитектура-стилей)
3. [Авторские CSS-keyframes](#3-авторские-css-keyframes)
4. [Keyframes из Tailwind v4](#4-keyframes-из-tailwind-v4)
5. [Реестр transitions](#5-реестр-transitions)
6. [Canvas-анимация TerminalGridBackground](#6-canvas-анимация-terminalgridbackground)
7. [JS-спиннер TerminalSpinner](#7-js-спиннер-terminalspinner)
8. [Компонент Shimmer](#8-компонент-shimmer)
9. [Boot-splash](#9-boot-splash)
10. [Микро-взаимодействия: hover / focus / active](#10-микро-взаимодействия-hover--focus--active)
11. [Скролл-поведение](#11-скролл-поведение)
12. [requestAnimationFrame вне анимаций](#12-requestanimationframe-вне-анимаций)
13. [Токены и фактическая палитра таймингов](#13-токены-и-фактическая-палитра-таймингов)
14. [Easing-семейства](#14-easing-семейства)
15. [prefers-reduced-motion](#15-prefers-reduced-motion)
16. [Проверено и НЕ найдено](#16-проверено-и-не-найдено)
17. [Приложение: субпроект agent/](#17-приложение-субпроект-agent)

---

## 1. Философия и обзор системы

Анимационная система приложения построена на принципе **«хром спокоен — фон живёт»**:

- **Интерфейсный хром** (сайдбар, меню, тулбары, транскрипт) анимирует практически только **цвет** (hover-подсветки) и два поворота шевронов. Никаких scale/lift/tilt-эффектов.
- **Вся «живость» вынесена в один самодостаточный canvas-слой** `TerminalGridBackground`: терминальная сетка с мерцанием, автономной змейкой (ИИ или игрок), логотипами-пеллетами и пиксельными speech-bubble.
- **Три индикатора занятости агента**: braille-спиннер (`setInterval` 80 мс), shimmer-текст (CSS, infinite), `animate-pulse`-скелетон mermaid; плюс `animate-spin` на всех git/update-операциях.
- **Появление без exit-анимаций**: тосты и splash исчезают мгновенно (unmount / удаление по таймеру).

Полный инвентарь: **2 авторских keyframes** (`approval-toast-in`, `shimmer-text`) + **2 утилиты Tailwind** (`animate-spin`, `animate-pulse`) + **11 transition'ов** (цвета / поворот / проявление) + **1 большой rAF-canvas-мир** + **2 JS-спиннера** (braille 80 мс, xterm `cursorBlink`) + **1 smooth-scroll**.

Библиотеки анимаций (framer-motion, gsap, react-spring, anime.js) **не используются**.

---

## 2. Архитектура стилей

| Файл | Роль |
|---|---|
| `src/index.css` (493 строки) | **Единственный стилевой файл приложения.** Импорт Tailwind v4, `@source` для streamdown, `@theme`-токены (цвета от `--theme-hue/--theme-saturation`, accent/skill/mention, шрифты), темы light/dark, glass-классы macOS, рестилинг streamdown-маркдауна, **оба авторских keyframes** (строки 409–453), терминальные классы. **Ни одного `transition:` в файле нет.** |
| `index.html` (строки 42–90) | Инлайн `<style>`: pre-CDT переменные темы (анти-мигание при старте) + boot-splash с двумя `transition: opacity 0.12s ease`. Head-скрипт читает localStorage (`monocode.themeHue/Saturation/sidebarOpacity/colorScheme/bodyGlass`) и ставит классы до первой отрисовки. |
| `src/surfaces/editorSearch.ts` | Тема CodeMirror как JS-объект (`EditorView.theme`) — единственный editor-файл с анимацией (`transition: transform`). |
| `src/main.tsx` → `import "./index.css"` | Единственная точка подключения CSS. |

Ключевые токены темы, влияющие на цвет анимаций:
- `--color-content` — HSL от пользовательских `--theme-hue` / `--theme-saturation`;
- `--color-background-base`, `--color-accent: hsl(211 92% 62%)`.

Все альфа-подсветки строятся по паттерну `bg-content/N` / `text-content/N` (Tailwind opacity modifier).

---

## 3. Авторские CSS-keyframes

### 3.1. `approval-toast-in` — въезд toast-карточки

`src/index.css:409–422`

```css
@keyframes approval-toast-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.approval-toast {
  animation: approval-toast-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

| Параметр | Значение |
|---|---|
| Длительность | **180 ms** |
| Easing | **cubic-bezier(0.22, 1, 0.36, 1)** — фирменная «smooth-out» кривая приложения |
| Итерации | 1, без delay, без fill |

**Применение:** `src/chrome/ApprovalToasts.tsx:62` — карточка подтверждения:
```tsx
<article className="approval-toast pointer-events-auto overflow-hidden rounded-xl border border-content/20 border-dashed bg-content/10 shadow-xl backdrop-blur-xl" role="status">
```
Портал-контейнер (`ApprovalToasts.tsx:28–31`): `fixed right-3 top-3 z-80 w-[min(360px,calc(100vw-24px))] flex flex-col gap-2` в `document.body`. Анимация играет при каждом монтировании карточки. **Exit-анимации нет** — мгновенный unmount.

Это **единственный entrance-keyframe всего UI**.

### 3.2. `shimmer-text` — бегущий блик по тексту

`src/index.css:424–453`

```css
.shimmer-text {
  background-image:
    linear-gradient(
      90deg,
      transparent calc(50% - var(--spread)),
      var(--color-content) calc(50%),
      transparent calc(50% + var(--spread))
    ),
    linear-gradient(
      hsl(var(--theme-hue) var(--theme-saturation) var(--content-lightness) / 0.4),
      hsl(var(--theme-hue) var(--theme-saturation) var(--content-lightness) / 0.4)
    );
  background-size: 250% 100%, auto;
  background-repeat: no-repeat, padding-box;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: shimmer-text var(--shimmer-duration, 2s) linear infinite;
}

@keyframes shimmer-text {
  from { background-position: 100% center; }
  to   { background-position: 0% center; }
}
```

Механика:
- Текст делается прозрачным (`color: transparent`), рисуется через `background-clip: text`.
- **Слой 1** — блик: градиент шириной `±var(--spread)` вокруг центра цвета контента, скользит по тексту справа налево (`background-position: 100% → 0%`), `background-size: 250%`.
- **Слой 2** — подложка: тот же цвет контента с альфой **0.4**.
- Параметризуется CSS-переменными `--spread` (ширина блика) и `--shimmer-duration` (см. §8).

**Применение:** только через компонент `Shimmer` — статусы живого хода агента (`AgentTranscript.tsx:303, 339`, duration 1 s) и handoff (`:978`, duration 1.4 s). Детали в §8.

---

## 4. Keyframes из Tailwind v4

Источник: `node_modules/tailwindcss/theme.css`. Попадают в билд только при использовании.

### 4.1. Используемые

```css
--animate-spin: spin 1s linear infinite;
@keyframes spin { to { transform: rotate(360deg); } }

--animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
@keyframes pulse { 50% { opacity: 0.5; } }
```

**`animate-spin` — 6 мест (все — индикаторы busy):**

| # | Файл : строка | Контекст |
|---|---|---|
| 1 | `src/surfaces/DiffPane.tsx:489` | git-операция в тулбаре диффа (`Loader size-3.5`) |
| 2 | `src/surfaces/DiffPane.tsx:755` | «Publish Branch» при syncing |
| 3 | `src/surfaces/DiffPane.tsx:772` | условно `${syncing ? "animate-spin" : ""}` на `<RefreshCw>` («Sync Changes») |
| 4 | `src/surfaces/DiffPane.tsx:798` | busy === "pr" |
| 5 | `src/chrome/ProjectSearch.tsx:215` | «Searching…» (`LoaderCircle size-3`) |
| 6 | `src/chrome/SidebarUpdate.tsx:86` | проверка обновлений |

Плюс один `animate-spin` внутри внешнего пакета `streamdown` (компилируется благодаря `@source` в `index.css:2`).

**`animate-pulse` — 2 места:**

| # | Файл : строка | Контекст |
|---|---|---|
| 1 | `src/surfaces/AgentMarkdown.tsx:370` | скелетон mermaid: `h-32 animate-pulse rounded-[10px] border border-content/10 bg-content/6` |
| 2 | `src/surfaces/TerminalGridBackground.tsx:395` | псевдо-курсор кнопки «take control»: `motion-safe:animate-pulse` (**единственное** уважение reduced-motion в приложении) |

### 4.2. Определены в теме, но не используются

`ping` (scale(2)+fade, 1 s) и `bounce` (translateY −25%, кусочные cubic-bezier) — в билд не попадают.

---

## 5. Реестр transitions

Всего **11 переходов**: 2 в inline-CSS `index.html`, 1 в JS-теме CodeMirror, 8 Tailwind-утилит (5 × `transition-colors`, 2 × `transition-transform`, 1 × `transition-opacity`). В самом `src/index.css` переходов ноль.

### 5.1. CSS-свойства

| # | Файл : строка | Код | Эффект |
|---|---|---|---|
| 1–2 | `index.html:78–89` | `#boot-splash img { transition: opacity 0.12s ease; }` (+ состояние `.boot-splash-out img { opacity: 0 }`) | Лого splash гаснет за 120 мс |
| 3 | `src/surfaces/editorSearch.ts:618–623` | `.cm-find-expand svg { transition: transform 0.12s ease; }` + `.cm-find.is-replace .cm-find-expand svg { transform: rotate(90deg); }` | Стрелка find-панели CodeMirror плавно поворачивается на 90° в режиме replace |

### 5.2. Tailwind-классы

Дефолты TW4: **150 ms**, easing **cubic-bezier(0.4, 0, 0.2, 1)**.

| # | Файл : строка | Классы | Эффект |
|---|---|---|---|
| 4 | `src/chrome/MenuBar.tsx:198` | `transition-colors` + `isActive ? "bg-content/15 text-content" : "text-content/70 hover:bg-content/10 hover:text-content"` | Пункты меню-бара |
| 5 | `src/chrome/SidebarUpdate.tsx:78` | `transition-colors` + `hasUpdate ? "bg-accent/15 text-content hover:bg-accent/20" : "text-content/50 hover:bg-content/5 hover:text-content"` | Кнопка проверки обновлений |
| 6 | `src/chrome/WindowControls.tsx:65` | `transition-colors hover:bg-content/10 hover:text-content` | Minimize |
| 7 | `src/chrome/WindowControls.tsx:75` | идентично | Maximize/Restore |
| 8 | `src/chrome/WindowControls.tsx:89` | `transition-colors hover:bg-red-600 hover:text-white` | Close (красная) |
| 9 | `src/surfaces/AgentTranscript.tsx:334` | `transition-transform ${expanded ? "rotate-90" : ""}` | ChevronRight ThinkingBlock — плавный поворот 90° |
| 10 | `src/surfaces/AgentTranscript.tsx:791` | `transition-transform ${open ? "rotate-90" : ""}` | ChevronRight заголовка tool-call |
| 11 | `src/surfaces/TerminalGridBackground.tsx:384` | `opacity-0 transition-opacity duration-200 group-hover:opacity-100` | Оверлей «take control» проявляется за 200 мс по hover группы |

### 5.3. Мгновенные вращения БЕЗ transition (непоследовательность)

Шевроны пикеров щёлкают мгновенно, в отличие от транскрипта:

- `src/chrome/AccessPicker.tsx:155` — `open ? "rotate-180" : ""`
- `src/chrome/ModelSettings.tsx:258` — то же
- `src/chrome/ModelPicker.tsx:325` — то же

---

## 6. Canvas-анимация TerminalGridBackground

Файлы: `src/surfaces/TerminalGridBackground.tsx` (404 стр.), `src/surfaces/gridArcade.ts` (518 стр.), `src/surfaces/speechBubble.ts` (155 стр.).

Самый крупный анимационный объект приложения: живая терминальная сетка на фоне, в которой мерцают ячейки, ходит волна по строкам и играет змейка (ИИ в idle, человек в режиме «take control»).

### 6.1. Константы отрисовки

`TerminalGridBackground.tsx:12–26`:

```ts
const CELL = 6;                    // размер ячейки, px
const GAP = 1;                     // зазор
const PITCH = CELL + GAP;          // шаг сетки = 7 px
const BORDER_OPACITY = 0.06;       // обводка всех ячеек rgba(fg, 0.06)
const PEAK_OPACITY = 0.28;         // пик яркости idle
const GAME_PEAK_OPACITY = 0.5;     // пик при ИИ-змейке
const PLAY_PEAK_OPACITY = 0.72;    // пик при игре игрока
const LOGO_OPACITY = 0.7;          // множитель альфы логотипа-пеллеты
const BUBBLE_OPACITY = 0.9;        // множитель альфы пузыря
const BUBBLE_EASE = 0.2;           // коэффициент экспоненциального сглаживания пузыря
const CELL_FLICKER_RATE = 0.0018;  // вероятность вспышки ячейки за кадр
const ROW_PULSE_RATE = 0.00035;    // вероятность пульса строки за кадр (idle)
const DECAY = 0.93;                // затухание интенсивности за кадр
const FRAME_MS = 33;               // FPS cap ~30
```

Константы аркады (`gridArcade.ts`):

```ts
TICK_MS = 70            // базовый тик ИИ (мс)
FAST_AT_LENGTH = 10     // длина, с которой включается быстрая скорость
FAST_TICK_MS = 52       // быстрый тик ИИ
// уровни игрока: low 72/54 · mid 38/26 · hard 22/16 мс (обычная/быстрая)
LOGO_CELLS = 3          // логотип занимает 3×3 клетки
LOGO_LIFE_MS = 12000    // жизнь логотипа
LOGO_FADE_MS = 500      // fade-in/out логотипа
LOGO_GROWTH = 5         // рост змейки за съеденный логотип
LOGO_REACH_MAX = 120    // предел достижимости логотипа (клеток)
SPEECH_FADE_MS = 260    // fade реплики
SPEECH_HOLD_MS = 2200   // удержание реплики
BOOT_FADE_MS = 420      // проявление всей сетки после бута
nextLogoDelay = 4200…10500 ms // пауза между логотипами
maxLength = clamp(floor(cols*0.4), 16, 80) // предел длины змейки
```

Реплики змейки `CHATTER` (20 фраз, повтор подряд исключён): `HELLO THERE!`, `GENERAL KENOBI`, `NOM NOM NOM`, `MINE!`, `DIBS`, `SNACK TIME`, `IS THIS EDIBLE?`, `OOH, SHINY`, `FREE REAL ESTATE`, `ACQUIRING TARGET`, `BRB, EATING`, `404: FOOD FOUND`, `SSSSSSS`, `TASTES LIKE TABS`, `NEEDS MORE SALT`, `NO TRADEMARKS HARMED`, `SHIP IT`, `YOINK`, `RESOLVING DEPENDENCY`, `CACHE MISS, SNACK HIT`.

### 6.2. Архитектура цикла

Один `useEffect(..., [])` настраивает всё (`TerminalGridBackground.tsx:68–254`):

1. **layout()** (:95–120): размеры через `getBoundingClientRect`; `canvas.width/height = размер × devicePixelRatio`, `ctx.setTransform(dpr,…)`. Сетка: `cols = ceil(width/PITCH)`, `rows = ceil(height/PITCH)`; массив `cells: {intensity}[]` переиспользуется при ресайзе, новые ячейки инициализируются `Math.random()<0.12 ? Math.random()*0.35 : 0`. Затем `arcade.resize(cols, rows)`.
2. **draw(time)** (:134–231) — бесконечный rAF-цикл с **FPS cap**: `if (time - lastFrame < FRAME_MS /*33*/) return` → ~30 FPS; `dt = time - lastFrame`.
3. Каждый кадр:
   - `arcade.step(dt)` — тики змейки аккумулятором `tickAcc += dt; while (tickAcc >= tick) advance()`;
   - синхронизация счёта в React через `scoreRef` / `setScore`;
   - в idle случайный `pulseRow()` с шансом 0.00035;
   - `stamp = new Float32Array(cols*rows)` — тело змейки и пеллет;
   - `ctx.clearRect`; двойной цикл rows×cols: случайное мерцание, `intensity *= DECAY`, `fillOpacity = max(intensity, game) * peak`, `fillRect` (>0.02) + `strokeRect` рамки;
   - логотип-приз: `ctx.drawImage(icon, …)` c `globalAlpha = pickup.alpha * LOGO_OPACITY`;
   - speech-bubble: экспоненциальное сглаживание позиции + `drawSpeechBubble(...)`.
4. **Наблюдатели**: `ResizeObserver(layout)`; `MutationObserver(documentElement, attributeFilter:["style","class"])` — перечитывает цвета темы (`getComputedStyle(document.body).color/backgroundColor` → `"r, g, b"`; fallback `"235,238,241"` / `"20,22,25"`).
5. **Очистка** (:248–253): `cancelAnimationFrame`, `disconnect()` обоих обсерверов, `arcadeRef.current = null`.

### 6.3. Эффекты

**Мерцание ячеек** — в idle каждая ячейка с шансом 0.0018 за кадр получает вспышку `intensity += 0.25…1.0`, затем всегда умножается на `DECAY = 0.93` → вспышка гаснет за ~30–40 кадров (~1–1.3 с).

**Пульс строки** — в idle шанс 0.00035 за кадр: всей случайной строке присваивается `max(intensity, 0.55*(0.35+rnd*0.65))` — бегущая световая волна.

**Змейка** (`gridArcade.ts`):
- тело `Cell[]`, направление `dir`, буфер поворота `pending`; разворот на 180° запрещён (`steer()` отбрасывает обратный вектор);
- новая голова с **заворотом через край поля** (wrap);
- столкновение с телом или превышение `maxLength` → мгновенный респавн `spawnSnake()` (у игрока обнуляет счёт);
- пеллет: +1 рост / +1 очко; проглоченный **логотип**: +5 рост/очков и случайная реплика из `CHATTER`;
- **ИИ `think()`**: жадный выбор из [прямо, влево, вправо]; оценка `−(торовая манхэттен-дистанция до цели) + rnd*0.15`; цель — центр логотипа, если тот на поле, иначе пеллет; клетка тела запрещена (хвост разрешён);
- **скорость**: idle 70→52 мс с длины ≥ 10; игрок: low 72/54, mid 38/26, hard 22/16 мс; смена режима сбрасывает аккумулятор тиков;
- **поле**: idle — верхние `floor(rows*0.62)` строк (мин 8), у игрока — все строки.

**Логотипы-призы**: случайная иконка провайдера (`HARNESSES`), PNG предзагружается в `new Image()`; footprint 3×3 клетки; спавн с проверкой **достижимости** (`minReach=7`, `maxReach=clamp(floor(cols*0.55),13,120)`, до 60 попыток); альфа — линейный fade-in/out по 500 мс на жизни 12 с.

**Speech bubble** (`speechBubble.ts`): пиксель-арт с `UNIT=2` px, ступенчатые углы/хвост (`TAIL_STEPS=3`), жёсткая тень со смещением `2*UNIT` (альфа ×0.2), шрифт `600 10px ui-monospace`, `letterSpacing: 1px`, привязка `snap()` к сетке юнитов; хвост переворачивается вверх/вниз по свободному месту и целится в голову змейки с clamp. Альфа: `min(age/260, 1−(age−2200)/260) * bootAlpha * 0.9`. Позиция следует за головой экспоненциально: `bubbleAt += (target − bubbleAt) * 0.2` каждый кадр, со мгновенным снапом при перепрыгивании края (`|dx| > width/3`).

**Boot-фейд**: `bootAlpha() = min(1, booted/420)` — множитель на все альфы (и на весь stamp) → вся сетка мягко проявляется после бута/ресайза/смены режима.

### 6.4. Режимы: idle vs «take control»

- **Idle**: лента высотой 192 px сверху (`absolute inset-x-0 top-0 h-48`), маска снизу `[mask-image:linear-gradient(to_bottom,#000_65%,transparent_100%)]`; по hover проявляется кнопка (§5.2 №11).
- **takeControl()**: контейнер разворачивается на весь экран (`absolute inset-0 z-20 bg-background-base`), получает фокус; window-keydown в capture: `Escape → releaseControl()`, стрелки/WASD → `steer()`; wheel заблокирован; активный элемент блюрится.
- **HUD игры** (:346–382): моноширинный `grid grid-cols-3 text-[11px] tracking-[0.14em] text-content/50`: слева `score`, в центре переключатель режимов `low/mid/hard` (активный `border-content/40 bg-content/10 text-content`), справа release-кнопка `border-content/20 bg-background-base/70 hover:border-content/40 hover:text-content`.

---

## 7. JS-спиннер TerminalSpinner

`src/chrome/TerminalSpinner.tsx` (целиком):

```tsx
const FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"] as const;

export function TerminalSpinner({ className = "inline-block w-3.5 select-none text-center text-[11px] leading-none" }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFrame((n) => (n + 1) % FRAMES.length), 80);
    return () => window.clearInterval(id);
  }, []);
  return <span aria-hidden className={className}>{FRAMES[frame]}</span>;
}
```

10 браильных кадров, **80 мс/кадр** (12.5 FPS), классический CLI-паттерн (как у npm/yarn).

**Использования** (`AgentTranscript.tsx`): строка активности агента (:299) и handoff (:977, вариант `text-content/45`).

Вторая JS-«анимация» — мигание курсора терминала: внутренний таймер xterm.js (`cursorBlink: true`, `TerminalView.tsx:129`); собственных keyframes xterm.css не добавляет.

---

## 8. Компонент Shimmer

`src/surfaces/Shimmer.tsx` (целиком):

```tsx
export interface ShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;   // сек, дефолт 2
  spread?: number;     // px на символ, дефолт 2
}

function ShimmerComponent({ children, as: Component = "span", className = "", duration = 2, spread = 2 }: ShimmerProps) {
  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);
  return (
    <Component
      className={`shimmer-text relative inline-block ${className}`.trim()}
      style={{ "--spread": `${dynamicSpread}px`, "--shimmer-duration": `${duration}s` } as CSSProperties}
    >
      {children}
    </Component>
  );
}
export const Shimmer = memo(ShimmerComponent);
```

Механика: ширина блика `--spread` масштабируется от длины строки (`длина × spread`), скорость — `--shimmer-duration`. Обе переменные потребляет CSS-класс `.shimmer-text` (§3.2). Единственные **анимационные CSS-переменные во всём приложении**.

**Использования** (только `AgentTranscript.tsx`):

| Строка | Контекст | duration |
|---|---|---|
| 303 | статус живого хода агента | 1 s |
| 339 | «Thinking…» пустого reasoning-блока | 1 s |
| 978 | подготовка handoff | 1.4 s |

---

## 9. Boot-splash

`index.html:42–90` + `main.tsx:15–21`.

Стартовый экран (лого 72×72) существует до гидратации React; head-скрипт заранее выставляет тему из localStorage, чтобы окно не мигало.

Гашение:
```ts
splash.classList.add("boot-splash-out");          // opacity → 0 за 0.12s ease
window.setTimeout(() => splash.remove(), 140);    // удаление из DOM
```
Вызывается из `BootGate` через `useLayoutEffect` при первом монтировании. Exit — мгновенное удаление после фейда.

---

## 10. Микро-взаимодействия: hover / focus / active

### 10.1. Вращения шевронов (единственные transform-переходы UI)

| Файл : строка | Элемент | Условие | Анимировано? |
|---|---|---|---|
| `AgentTranscript.tsx:334` | ChevronRight ThinkingBlock | `rotate-90` | Да, `transition-transform` 150 мс |
| `AgentTranscript.tsx:791` | ChevronRight tool-call header | `rotate-90` | Да, `transition-transform` 150 мс |
| `AccessPicker.tsx:155` | шеврон | `rotate-180` | Нет, мгновенно |
| `ModelSettings.tsx:258` | шеврон | `rotate-180` | Нет |
| `ModelPicker.tsx:325` | шеврон | `rotate-180` | Нет |

### 10.2. Статические translate (позиционирование, не анимация)

`TitleBar.tsx:409,675` (`-translate-y-1/2`), `Composer.tsx:860`, `FilePicker.tsx:166`, `ColorPickerPopover.tsx:107,131`, `SurfaceTabs.tsx:187` — центрирование маркеров/индикаторов.

### 10.3. Подтверждённые отсутствия

Grep `(hover|active|focus|group-hover):(scale|rotate|translate)-` по всему `src/` → **0 совпадений**. Нет hover-масштабирования, press-scale, lift/tilt.

**Hover-семантика приложения — исключительно цветовая:**
- поверхности: `hover:bg-content/5`, `/10`, `/15`;
- текст: `hover:text-content`, `hover:text-white`;
- рамки: `hover:border-content/25`, `/40`, `/45`;
- ссылки: `hover:underline` (`AgentTranscript.tsx:877`, `AgentMarkdown.tsx:171`);
- деструктив: `hover:bg-red-600` (WindowControls Close).

### 10.4. Курсорные фидбеки (не анимация)

- `SessionPane.tsx:144` — `cursor-grab active:cursor-grabbing` на перетаскиваемой панели;
- сплиттеры: `cursor-col-resize touch-none` (`DiffPane.tsx:186`, `PaneTree.tsx:397–398`); на время drag на body ставится `cursor-resize` соответствующего направления.

---

## 11. Скролл-поведение

- Повсеместно — программный `scrollIntoView("nearest")` **без анимации** (мгновенная прокрутка к новым сообщениям/строкам).
- Единственный `behavior: "smooth"` — кнопки прокрутки вкладок (`SurfaceTabs.tsx`).
- Отложенное восстановление скролла редактора — `requestAnimationFrame(restoreScroll)` (`FileEditor.tsx:582`).

---

## 12. requestAnimationFrame вне анимаций

Из ~20 вхождений rAF настоящей анимацией является только canvas-цикл (§6). Остальные — троттлинг ввода/раскладки:

| Файл : строка | Назначение |
|---|---|
| `DiffPane.tsx:116–140` | применение ширины панели диффа не чаще раза в кадр; отмена в cleanup |
| `PaneTree.tsx:407–443` | тот же паттерн для разделителей дерева панелей (`onPreview` через rAF) |
| `Sidebar.tsx:233–243` | троттлинг ширины сайдбара при ресайзе |
| `FileEditor.tsx:582, 758–766` | восстановление скролла; двойной rAF перед измерением CodeMirror |

---

## 13. Токены и фактическая палитра таймингов

**CSS-переменных для durations/easings НЕТ** (grep `--duration|--ease|transition-duration|transition-timing` → пусто; исключение — локальные инлайновые кастомы Shimmer `--spread` / `--shimmer-duration`). Все тайминги — магические числа в местах использования. Фактическая палитра:

| Тайминг | Применение |
|---|---|
| ~30 FPS cap (33 мс) | canvas-цикл фона |
| 80 мс | кадры TerminalSpinner (12.5 FPS) |
| 120 мс, `ease` | fade boot-splash; поворот svg find-панели CodeMirror |
| 150 мс, TW-default | все `transition-colors` / `transition-transform` |
| 180 мс, smooth-out | въезд approval-toast |
| 200 мс, `ease` | проявление оверлея «take control» |
| 260 мс | fade speech-bubble (in/out) |
| 420 мс | boot-фейд canvas-сетки; (в agent/) luma-fade-up |
| 500 мс | fade-in/out логотипов-призов |
| 1000 / 1400 / 2000 мс | Shimmer (linear, infinite) |
| 1 s / 2 s | animate-spin / animate-pulse |
| 16–72 мс | тики змейки (по сложности/длине) |
| 2200 мс | удержание реплики |
| 12 000 мс | жизнь логотипа |

---

## 14. Easing-семейства

| Кривая | Где используется |
|---|---|
| **`cubic-bezier(0.22, 1, 0.36, 1)`** — фирменная «smooth-out» | approval-toast-in; (в agent/) `--ease-smooth-out`, luma-fade-up |
| **TW-default `cubic-bezier(0.4, 0, 0.2, 1)`** | все микро-переходы хрома (colors/transform), animate-pulse |
| **`ease`** | boot-splash, find-panel svg, take-control overlay |
| **`linear`** | циклические процессы: shimmer-text, animate-spin, luma-shimmer |
| **Экспоненциальное сглаживание** (`k = BUBBLE_EASE 0.2`) | следование пузыря за головой змейки (canvas) |
| **Линейные ручные fade** (`age/LIFE`) | альфы логотипов, реплик, boot-фейда (canvas) |

---

## 15. prefers-reduced-motion

Ровно **одно** уважение accessibility-настройки во всём приложении:

```tsx
// src/surfaces/TerminalGridBackground.tsx:395
<span className="inline-block h-3 w-1.5 bg-content/75 motion-safe:animate-pulse" aria-hidden />
```

Глобального `@media (prefers-reduced-motion: reduce)` сброса нет ни в `index.css`, ни в инлайнах. При включённой опции ОС продолжают работать: shimmer-текст, оба спиннера, canvas-аркада, smooth-scroll вкладок, все transition. Это самая заметная дыра анимационной системы. (В субпроекте `agent/` такой блок есть — см. §17.)

---

## 16. Проверено и НЕ найдено

По всему `src/`, `public/`, `index.html`, `package.json`:

- Web Animations API (`element.animate`, `getAnimations`) — **0**;
- IntersectionObserver / reveal-on-scroll — **0**;
- SMIL (`<animate>`, `animateTransform`, `animateMotion`) во всех SVG, включая `public/` — **0**;
- View Transitions API, `@starting-style`, scroll-driven animations, `will-change` — **0**;
- FLIP / анимации сортировки и drag-and-drop (`hooks/useSortable.ts`, `lib/drag.ts`) — **0** (чистая геометрия);
- Библиотеки анимаций в зависимостях — **отсутствуют**; из внешнего кода в билд попадает только `animate-spin` внутри streamdown (через `@source`);
- xterm.css подключается пакетом, собственных keyframes не добавляет.

---

## 17. Приложение: субпроект agent/

Отдельный npm-пакет `agent/` (не входит в Tauri-бандл десктопа) со своим `agent/src/styles.css` (197 строк): Tailwind v4, светлая палитра Luma, токены радиусов/теней и **два easing-токена**:

```css
--ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1); /* та же кривая, что approval-toast! */
--ease-out:        cubic-bezier(0.23, 1, 0.32, 1);
```

### 17.1. `luma-fade-up` — появление контента

```css
@keyframes luma-fade-up {
  from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);   filter: blur(0); }
}
.luma-fade-up { animation: luma-fade-up 420ms var(--ease-smooth-out) both; }
```
Fade-up с размытием, 420 мс, fill:both. Применения: welcome-splash, карточки списка событий.

### 17.2. `luma-blob` — дыхающее пятно

```css
@keyframes luma-blob {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50%      { transform: translate(-48%, -52%) scale(1.06); }
}
```
Применение — inline в `welcome-splash.tsx:31–37`: розовое радиальное пятно за аватаром
(`background: radial-gradient(circle, #f27aa8 0%, #e8a0d8 40%, transparent 70%)`,
`blur-3xl opacity-80`, **6 s**, `var(--ease-out)`, infinite).

### 17.3. `luma-shimmer` — скелетоны загрузки

```css
@keyframes luma-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.luma-skeleton {
  background: linear-gradient(90deg, #eceae6 0%, #f7f6f4 45%, #eceae6 100%);
  background-size: 800px 100%;
  animation: luma-shimmer 1.4s linear infinite;
}
```
17 использований в роутах и карточках (скелетоны списков/деталей).

### 17.4. `luma-pulse` — определён, но мёртвый код

```css
@keyframes luma-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
```
Ни одного применения в `agent/src`.

### 17.5. prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .luma-fade-up, .luma-skeleton, .luma-login-glow, .luma-welcome-glow {
    animation: none !important;
  }
}
```
В отличие от основного приложения, субпроект анимации отключает.

---

## Резюме

Анимационная система monocode-desktop:

- **Хром**: 5 × `transition-colors` (hover-подсветки, 150 мс), 2 × `transition-transform` (шевроны 90°), 1 × `transition-opacity` (оверлей 200 мс), 1 entrance-keyframe (`approval-toast-in`, 180 мс smooth-out).
- **Живость**: один rAF-canvas-мир (сетка 7 px pitch, мерцание, пульсы строк, змейка с ИИ, логотипы-призы, pixel-art speech-bubble, boot-фейд) с полным набором собственных констант темпа.
- **Занятость**: braille-спиннер 80 мс, shimmer-текст (linear infinite, параметризуемый), `animate-pulse`-скелетоны, `animate-spin` на git/update.
- **Прочее**: smooth-scroll вкладок, курсорные фидбеки drag-операций.
- **Долги системы**: нет токенов durations/easings (магические числа), нет exit-анимаций, непоследовательные повороты шевронов (пикеры без transition), и почти полное отсутствие поддержки `prefers-reduced-motion` (1 из ~15 анимаций).
 Server Error
TypeError: Cannot read properties of null (reading 'useContext')

This error happened while generating the page. Any console logs will be displayed in the terminal window.
Call Stack
t.useContext
file:///D:/adaption-main/node_modules/.pnpm/next@14.1.4_react-dom@18.2.0_react@18.2.0_sass@1.72.0/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:162962)
Module.usePathname
file:///D:/adaption-main/.next/server/chunks/2cc15_next_dist_esm_74f816._.js (3539:355)
ErrorBoundary
file:///D:/adaption-main/.next/server/chunks/2cc15_next_dist_esm_74f816._.js (3813:344)
ai
file:///D:/adaption-main/node_modules/.pnpm/next@14.1.4_react-dom@18.2.0_react@18.2.0_sass@1.72.0/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:6391)
<unknown>
file:///D:/adaption-main/node_modules/.pnpm/next@14.1.4_react-dom@18.2.0_react@18.2.0_sass@1.72.0/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:11242)
ab
file:///D:/adaption-main/node_modules/.pnpm/next@14.1.4_react-dom@18.2.0_react@18.2.0_sass@1.72.0/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:13009)
aS
file:///D:/adaption-main/node_modules/.pnpm/next@14.1.4_react-dom@18.2.0_react@18.2.0_sass@1.72.0/node_modules/next/dist/compiled/next-serv