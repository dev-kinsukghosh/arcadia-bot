import { createSSRApplication } from './main.js';

const { app, router } = createSSRApplication();

async function bootstrap() {
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // 1. Instant synchronous check from sessionStorage cache
  try {
    if (sessionStorage.getItem('maintenance_active') === 'true') {
      window.__INITIAL_MAINTENANCE__ = {
        active: true,
        reason: sessionStorage.getItem('maintenance_reason') || '',
      };
      window.__IS_MAINTENANCE__ = true;
    }
  } catch {
    // ignore
  }

  // 2. Precheck maintenance status BEFORE mounting to eliminate flash of old content
  try {
    const res = await fetch(`${API_BASE}/api/maintenance`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok || res.status === 403) {
      const data = await res.json();
      if (data && data.maintenance && !data.isDev) {
        window.__INITIAL_MAINTENANCE__ = {
          active: true,
          reason: data.reason || '',
        };
        window.__IS_MAINTENANCE__ = true;
        try {
          sessionStorage.setItem('maintenance_active', 'true');
          sessionStorage.setItem('maintenance_reason', data.reason || '');
        } catch {
          // ignore
        }
      } else if (data && !data.maintenance) {
        window.__INITIAL_MAINTENANCE__ = { active: false, reason: '' };
        window.__IS_MAINTENANCE__ = false;
        try {
          sessionStorage.removeItem('maintenance_active');
          sessionStorage.removeItem('maintenance_reason');
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Network failure, fallback to existing state
  }

  await router.isReady();
  app.mount('#app');
}

bootstrap();
