import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function prerender() {
  console.log('Starting Client and SSR builds...');

  // 1. Build client assets (CSR bundle)
  await build({
    configFile: path.resolve(__dirname, 'vite.config.mjs'),
    root: __dirname,
    build: {
      outDir: 'dist',
      ssrManifest: true,
    },
  });

  // 2. Build SSR bundle (Server compiled bundle)
  await build({
    configFile: path.resolve(__dirname, 'vite.config.mjs'),
    root: __dirname,
    build: {
      ssr: 'src/entry-server.js',
      outDir: 'dist-ssr',
      minify: false,
    },
  });

  console.log('Builds completed. Loading SSR render function...');

  // 3. Load compiled SSR render function (using file:// URL for Windows ESM loader)
  const ssrBundlePath = path.resolve(__dirname, 'dist-ssr/entry-server.mjs');
  const { render } = await import(pathToFileURL(ssrBundlePath).href);

  // 4. Read the index.html template from the client build
  const templatePath = path.resolve(__dirname, 'dist/index.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // 5. Define routes to prerender
  const routes = [
    '/live-market',
    '/currency-history',
    '/exchange',
    '/convoy',
    '/towny',
    '/shops',
    '/tools',
  ];

  console.log('Prerendering routes...');
  for (const route of routes) {
    try {
      const appHtml = await render(route);
      const html = template.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`);

      // Write route to its own HTML file, e.g. /live-market -> live-market.html
      const fileName = `${route.replace(/^\//, '') || 'index'}.html`;
      const filePath = path.resolve(__dirname, 'dist', fileName);

      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`✓ Prerendered ${route} -> dist/${fileName}`);
    } catch (err) {
      console.error(`✗ Failed to prerender ${route}:`, err);
    }
  }

  // 6. Clean up temporary SSR folder
  console.log('Cleaning up temporary SSR build...');
  fs.rmSync(path.resolve(__dirname, 'dist-ssr'), { recursive: true, force: true });

  console.log('SSG Prerendering Completed successfully!');
}

prerender().catch((err) => {
  console.error('SSG Prerender Error:', err);
  process.exit(1);
});
