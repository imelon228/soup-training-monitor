import { defineConfig } from 'vitest/config';

// Test-only configuration is kept separate from vite.config.ts so Vitest's
// Vite types cannot conflict with @vitejs/plugin-react during production build.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    globals: true,
  },
});
