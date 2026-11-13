# Soup Training Monitor — быстрый старт

## Сразу посмотреть интерфейс без установки

Открой файл `standalone-preview.html` в Chrome или Edge. Это автономный preview: ему не нужны Node.js, npm, интернет или backend. Он показывает список запусков, детали run, графики, zoom и просмотр значений при наведении.

> Это автономный preview для быстрого просмотра. Полная версия проекта — React + TypeScript + Vite, с ECharts и Web Worker — находится в `src/`.

## Запустить полную React-версию на Windows

Установи Node.js 20.19+ или 22.12+. Затем открой PowerShell в папке проекта и выполни:

```powershell
npm.cmd install
npm.cmd run dev
```

Открой адрес, который покажет Vite (обычно `http://localhost:5173`). Если у тебя PowerShell разрешает `npm` напрямую, можно использовать обычные команды `npm install` и `npm run dev`.

## Проверки

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

В текущей сборочной среде зависимости не удалось загрузить из npm registry из-за DNS-ошибки `EAI_AGAIN`, поэтому Vitest и production build здесь не запускались. Проверены отдельно строгой компиляцией TypeScript основные модули данных, ручными Node assertions и синтаксисом всех TS/TSX файлов. См. `docs/TEST_RESULTS.md`.

## Развернуть на Vercel

1. Создай GitHub repository и загрузи в него содержимое этой папки.
2. На Vercel выбери **Add New → Project** и импортируй репозиторий.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Install command: `npm install`.
7. Нажми Deploy.

Файл `vercel.json` уже содержит SPA rewrite для React Router, поэтому прямое открытие `/runs/run-020` должно вести в приложение.

## Что лежит в проекте

- `docs/ORIGINAL_PROMPT.txt` — сохранённый полный промпт, по которому собран сайт.
- `src/` — основной React/TypeScript проект.
- `tests/` — Vitest unit tests.
- `standalone-preview.html` — автономный preview без npm.
- `docs/TECHNICAL_NOTE.md` — архитектура, обработка данных, ограничения и предварительный verdict.
- `docs/TEST_RESULTS.md` — что реально было проверено.
- `docs/performance/README.md` — как снять обязательные Chrome DevTools traces при CPU throttling ×4.
