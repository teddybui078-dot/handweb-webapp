import { defineConfig } from 'vite'

// MediaPipe ships large wasm assets; keep them external-friendly and bump the
// chunk warning limit so the three.js bundle doesn't spam the console.
export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
