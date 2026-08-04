import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(async ({ command }) => {
  const plugins = [
    vue(),

    tailwindcss(),

    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      vueTemplate: true,
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
      },
    }),

    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true,
      dts: 'src/components.d.ts',
    }),
  ];

  // Vue Inspector (Development only)
  if (command === 'serve') {
    try {
      const { default: Inspector } = await import('vite-plugin-vue-inspector');

      plugins.push(Inspector());
    } catch {
      console.warn('[vite] vite-plugin-vue-inspector not installed. Skipping.');
    }
  }

  // Bundle visualizer (Production build only)
  if (command === 'build') {
    plugins.push(
      visualizer({
        filename: 'dashboard/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      host: true,
      port: 5173,
      warmup: {
        clientFiles: ['./src/main.js', './src/App.vue', './src/router.js'],
      },
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 800,

      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('chart.js') || id.includes('vue-chartjs')) {
              return 'vendor-charts';
            }

            if (id.includes('@fortawesome')) {
              return 'vendor-icons';
            }

            return 'vendor';
          },
        },
      },
    },

    plugins,
  };
});
