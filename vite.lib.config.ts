import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AsciiScene',
      fileName: 'ascii-scene',
    },
    rollupOptions: {
      external: ['three', /^three\//],
      output: [
        {
          format: 'es',
          entryFileNames: '[name].js',
        },
        {
          format: 'umd',
          name: 'AsciiScene',
          entryFileNames: '[name].umd.cjs',
          globals: {
            'three': 'THREE',
            'three/addons/loaders/GLTFLoader.js': 'THREE',
            'three/addons/loaders/DRACOLoader.js': 'THREE',
          },
        },
      ],
    },
    outDir: 'dist',
    sourcemap: false,
  },
})
