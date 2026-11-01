import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import MarketMonitor from './components/MarketMonitor.vue';
import HistoryChart from './components/HistoryChart.vue';
import ExchangeCalculator from './components/ExchangeCalculator.vue';
import ConvoyStock from './components/ConvoyStock.vue';
import TownyMonitor from './components/TownyMonitor.vue';
import ShopsMonitor from './components/ShopsMonitor.vue';
import EventsWarsMonitor from './components/EventsWarsMonitor.vue';
import PlayerMonitor from './components/PlayerMonitor.vue';
import ToolsMonitor from './components/ToolsMonitor.vue';

const routes = [
  {
    path: '/',
    name: 'root',
    beforeEnter: (to, from, next) => {
      if (typeof window !== 'undefined' && window.__IS_MAINTENANCE__) {
        return next();
      }
      next('/live-market');
    },
    component: MarketMonitor,
  },
  {
    path: '/monitor',
    redirect: '/live-market',
  },
  {
    path: '/live-market',
    name: 'live-market',
    component: MarketMonitor,
  },
  {
    path: '/currency-history',
    name: 'currency-history',
    component: HistoryChart,
  },
  {
    path: '/exchange',
    name: 'exchange',
    component: ExchangeCalculator,
  },
  {
    path: '/convoy',
    name: 'convoy',
    component: ConvoyStock,
  },
  {
    path: '/towny',
    name: 'towny',
    component: TownyMonitor,
  },
  {
    path: '/tools',
    name: 'tools',
    component: ToolsMonitor,
  },
  {
    path: '/players',
    name: 'players',
    component: PlayerMonitor,
  },
  {
    path: '/shops',
    name: 'shops',
    component: ShopsMonitor,
  },
  {
    path: '/events-wars',
    name: 'events-wars',
    component: EventsWarsMonitor,
  },
];

export function createRouterInstance() {
  const isServer = typeof window === 'undefined';
  const router = createRouter({
    history: isServer ? createMemoryHistory() : createWebHistory(),
    routes,
  });

  router.beforeEach((to, from, next) => {
    if (isServer) return next();

    // When maintenance is active, any page navigation instantly redirects to '/'
    if (window.__IS_MAINTENANCE__ && to.path !== '/') {
      return next('/');
    }

    next();
  });

  return router;
}
