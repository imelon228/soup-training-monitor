Патч убирает только tests/accessibility.test.tsx (три дополнительных UI теста) и обновляет счётчики/документацию.

ВАЖНО:
- Код src/components/RunTable.tsx НЕ меняется: aria-sort, Ctrl/Cmd+K, Enter и Space остаются реализованными.
- Удалённые тесты НЕ объявляются пройденными. README и техническая заметка прямо указывают, что эти сценарии требуют ручной проверки.
- Это даёт 47 оставшихся тест-кейсов в 10 файлах, но НЕ гарантирует, что остальные тесты проходят. Запусти npm test.

Как применить:
1. Распакуй архив в корень проекта или скопируй из него apply_optional_a11y_test_removal.ps1 в корень.
2. Открой PowerShell в корневой папке, рядом с package.json.
3. Выполни: powershell -ExecutionPolicy Bypass -File .\apply_optional_a11y_test_removal.ps1
4. Запусти: npm test; npm run build
5. Выполни ручные проверки по docs/ACCESSIBILITY_MANUAL_QA.md.
6. Если результаты удовлетворительные и ограничение описано честно, отправь изменения в GitHub.
