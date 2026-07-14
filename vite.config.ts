import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000 },
  // The model layer is pure and synchronous — no DOM, no React, no async. It
  // needs no environment beyond node, which is why these tests run in ~1s and
  // can be the thing you lean on rather than the screenshot driver.
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
