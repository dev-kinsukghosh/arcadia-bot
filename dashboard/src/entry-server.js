import { renderToString } from '@vue/server-renderer';
import { createSSRApplication } from './main.js';

export async function render(url) {
  const { app, router } = createSSRApplication();

  // Push the route URL to the router
  await router.push(url);
  await router.isReady();

  // Render the application to an HTML string
  const html = await renderToString(app);

  return html;
}
