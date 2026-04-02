import { defineConfig } from 'vite'
import { resolve } from 'path'

// Standalone build: bundles Three.js + Pretext + everything into a single file
// for <script> tag usage without any build tools
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/standalone.ts'),
      name: 'AsciiScene',
      fileName: 'ascii-scene.standalone',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: false, // don't wipe the lib build
    sourcemap: true,
    minify: true,
  },
})
