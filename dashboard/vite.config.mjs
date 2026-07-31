import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from parent directory (since Vite runs inside dashboard/ directory)
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const port = env.PORT || 3000;

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      proxy: {
        '/status': {
          target: `http://localhost:${port}`,
          changeOrigin: true,
        },
        '/currencies': {
          target: `http://localhost:${port}`,
          changeOrigin: true,
        },
      },
    },
  };
});
