import { createSSRApplication } from './main.js';

const { app, router } = createSSRApplication();

router.isReady().then(() => {
  app.mount('#app');
});
