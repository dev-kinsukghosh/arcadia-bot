import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import MarketMonitor from './components/MarketMonitor.vue';
import HistoryChart from './components/HistoryChart.vue';
import ExchangeCalculator from './components/ExchangeCalculator.vue';
import ConvoyStock from './components/ConvoyStock.vue';
import TownyMonitor from './components/TownyMonitor.vue';
import ShopsMonitor from './components/ShopsMonitor.vue';

const routes = [
  {
    path: '/',
    redirect: '/live-market',
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
    path: '/shops',
    name: 'shops',
    component: ShopsMonitor,
  },
];

export function createRouterInstance() {
  const isServer = typeof window === 'undefined';
  return createRouter({
    history: isServer ? createMemoryHistory() : createWebHistory(),
    routes,
  });
}
