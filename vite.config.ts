/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Relative base so the built game works from any folder or static host.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.5 MB
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
