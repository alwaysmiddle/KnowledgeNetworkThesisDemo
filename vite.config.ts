import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // '@' → src, so DS components import as '@/ds' (see tsconfig.app.json paths).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 3000 },
  // The model layer is pure and synchronous — no DOM, no React, no async. It
  // needs no environment beyond node, which is why these tests run in ~1s and
  // can be the thing you lean on rather than the screenshot driver.
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
