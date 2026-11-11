import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// `npm run build` inlines all JS and CSS into dist/index.html, so the app runs by double-clicking that one file
// (file://) on Windows or macOS: no server, no install.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
})
