import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep the production Vite config typed against the project's top-level Vite
// installation. Importing defineConfig from 'vitest/config' here can load a
// second Vite type tree and cause PluginOption incompatibilities on CI/Vercel.
export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
});
