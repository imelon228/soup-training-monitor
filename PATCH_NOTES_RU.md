# Патч Soup Training Monitor — Data Truthfulness и release checks

Этот архив — **overlay-патч**, а не полный проект. Распакуйте его поверх существующего репозитория `soup-training-monitor`, сохраняя структуру каталогов. Замените совпадающие файлы и добавьте новые. Не удаляйте и не пересоздавайте репозиторий.

## Что входит в патч

- Более строгая проверка структуры исходных series: равные длины массивов, конечные X/step-координаты и корректный `expectedStepInterval`.
- Viewport-aware Min-Max downsampling с сохранением локальных минимумов/максимумов, видимых invalid readings, duplicate observations, gap boundaries и planted spike.
- Дубликаты не усредняются и не сдвигаются через искусственный epsilon; линия получает break на настоящем step, значения доступны отдельно.
- `NaN` и `Infinity` остаются в исходных данных и диагностике, но не передаются как конечные координаты в scatter renderer.
- Tooltip сохраняет исходные точные значения; форматирование осей не меняет метрики.
- Три метрики используют linear axes, `smooth: false`, `connectNulls: false`; ECharts sampling не включается.
- Доступная таблица сводных точек, raw issue records и CSV export всех найденных проблем.
- Обработка отмены Worker и защита от stale responses.
- Дополнительные unit tests: в исходниках патча сейчас **49 тест-кейсов в 10 тестовых файлах**. Они добавлены, но должны быть выполнены в вашем локальном проекте.
- Hook-level test для out-of-order response: старый завершившийся позже запрос не может заменить текущий run.
- GitHub Actions workflow для lint, tests и production build.
- Документы по Data Truthfulness, performance capture, limitations и SHIP checklist.

## Важно про lock-файл

Патч не содержит `package-lock.json` и не меняет версии зависимостей. Сохраните существующий lock-файл из своего репозитория. Это важно для `npm ci` и воспроизводимой установки.

## Как применить

1. Скачайте ZIP и распакуйте содержимое прямо в корень локального репозитория `soup-training-monitor`.
2. Подтвердите замену файлов и объединение папок.
3. Убедитесь, что `package-lock.json` остался на месте.
4. Откройте терминал в корне проекта и выполните:

```bash
npm ci
npm run lint
npm test
npm run build
npm run preview
```

`npm run build` выполняет TypeScript project build и Vite production build. Не отправляйте проект на финальную оценку, пока эта команда не завершится с кодом 0.

## GitHub и Vercel

После успешных локальных проверок:

```bash
git add -A
git commit -m "Improve data truthfulness and release validation"
git push origin main
```

Vercel должен собирать именно новый commit. Рекомендуемые настройки: Framework `Vite`, Build Command `npm run build`, Output Directory `dist`, Node.js `22.x`.

GitHub Actions запускает `npm ci`, `npm run lint`, `npm test` и `npm run build` на push/pull request в `main`. Дождитесь зелёного статуса workflow и `Ready` в Vercel.

## Что нужно проверить вручную на сайте

- Откройте `/runs/run-020`, убедитесь, что отображается 1 000 000 source points и Loss spike на step 500 000.
- Проверьте zoom на desktop и mobile, hover tooltip и reset zoom.
- Откройте runs с `NaN`/`Infinity`, duplicate steps, unsorted steps и gaps; сверяйте исходные записи с raw issue table/CSV.
- Быстро переключайтесь между разными run и возвращайтесь назад; старые ответы не должны заменять выбранный run.
- Проверьте direct navigation/refresh для `/runs/run-020`.
- Проверьте ширины 1440, 1024, 768, 390 и 320 px, клавиатурное управление, focus, контрастность и reduced motion.

## Performance evidence — не имитировать

В коде доступны User Timing меры `soup:worker:*`, `soup:zoom:event-to-next-paint` и `soup:hover:event-to-next-paint`. Это диагностические прокси, а не замена Chrome Performance trace.

Перед финальным SHIP verdict запишите в Chrome DevTools Performance baseline текущего/предыдущего deployment и optimized deployment при CPU throttling ×4, снимите memory в Chrome Task Manager на run-020 и сохраните исходные trace-файлы/скриншоты в `docs/performance/`. Сравнивайте одинаковое устройство, браузер, viewport и сценарии; указывайте медиану как минимум трёх прогонов. Не заполняйте таблицы выдуманными цифрами.

## Что уже проверено при подготовке патча

- Strict TypeScript check чистых domain/data модулей — PASS.
- Node smoke check: 20 runs, 1 000 000 points, spike сохранён в 12 вручную проверенных комбинациях viewport/ширины, проверки NaN/Infinity, duplicate, gap, tooltip formatter, timezone, summary и invalid input — PASS.
- Синтаксическая transpilation 33 TS/TSX файлов — PASS, 0 синтаксических ошибок.
- Контраст светлой темы для перечисленных text/accent tokens против sidebar background рассчитан статически; минимум 4.66:1.

**Не запускались в текущей среде:** полный `npm test` для расширенного набора 49 тестов, `npm run lint`, полный `npm run build`, браузерная ручная проверка и Chrome Performance traces. Финальное состояние проекта можно подтвердить только после запуска этих проверок у вас и проверки нового Vercel deployment.
