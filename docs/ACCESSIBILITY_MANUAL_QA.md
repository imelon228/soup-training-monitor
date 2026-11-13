# Accessibility Manual QA

The three automated UI interaction tests for table sort semantics, Ctrl/Cmd+K search focus and Enter/Space run-row activation were removed from the Vitest suite after repeated failures in the current test setup. This does **not** mean the interactions passed. The implementation remains in `src/components/RunTable.tsx`; perform these checks manually against the deployed build and disclose them as manual checks in the submission note.

## Manual checks

1. Open the Runs page and use Tab / Shift+Tab to reach the search field, filters and sortable column controls. Confirm visible focus at every step.
2. Focus the search field, type a run ID, and confirm the list filters correctly.
3. With focus outside editable controls, press Ctrl+K (or Cmd+K on macOS). Confirm focus moves to the search field.
4. Focus a run row and press Enter. Confirm the matching Run Details page opens.
5. Repeat with Space. Confirm it opens the same run and does not scroll the page unexpectedly.
6. Activate a sortable header using Enter or Space. Confirm the rows reorder and the announced sort state matches the visible direction.
7. Confirm that clicking a nested button or input does not unexpectedly navigate the row.

Record browser, operating system, test date, and any failures. Do not describe these checks as automated tests.
