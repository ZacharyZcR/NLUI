import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NLUIVueUI',
      formats: ['es', 'umd'],
      fileName: (format) => `vue-ui.${format === 'es' ? 'es' : 'umd'}.js`,
    },
    rollupOptions: {
      external: ['vue', '@nlui/client', '@nlui/vue'],
      output: {
        globals: {
          vue: 'Vue',
          '@nlui/client': 'NLUIClient',
          '@nlui/vue': 'NLUIVue',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          return assetInfo.name || '';
        },
      },
    },
    cssCodeSplit: false,
  },
});
