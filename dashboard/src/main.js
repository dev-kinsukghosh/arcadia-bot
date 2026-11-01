import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import { createRouterInstance } from './router';

// Import FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faArrowTrendUp,
  faArrowTrendDown,
  faScaleBalanced,
  faCoins,
  faChartLine,
  faShieldHalved,
  faFingerprint,
  faRotate,
  faCalculator,
  faDownload,
  faStar,
  faBell,
  faSearch,
  faFilter,
  faCircleCheck,
  faCheck,
  faTriangleExclamation,
  faSliders,
  faCircleInfo,
  faGlobe,
  faTimes,
  faChevronDown,
  faChevronUp,
  faFlag,
  faCube,
  faShop,
  faMinus,
  faBars,
  faCalendarAlt,
  faShieldAlt,
  faCrosshairs,
  faScroll,
  faCalendarCheck,
  faExclamationCircle,
  faSyncAlt,
  faUsers,
  faLayerGroup,
  faClock,
  faList,
  faCrown,
  faPlusCircle,
  faTrashAlt,
  faWrench,
  faCodeCompare,
  faBuildingColumns,
  faChartPie,
  faTags,
  faHourglassHalf,
  faCopy,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

// Add icons to library
library.add(
  faArrowTrendUp,
  faArrowTrendDown,
  faScaleBalanced,
  faCoins,
  faChartLine,
  faShieldHalved,
  faFingerprint,
  faRotate,
  faCalculator,
  faDownload,
  faStar,
  faBell,
  faSearch,
  faFilter,
  faCircleCheck,
  faCheck,
  faTriangleExclamation,
  faSliders,
  faCircleInfo,
  faGlobe,
  faTimes,
  faChevronDown,
  faChevronUp,
  faFlag,
  faCube,
  faShop,
  faMinus,
  faBars,
  faCalendarAlt,
  faShieldAlt,
  faCrosshairs,
  faScroll,
  faCalendarCheck,
  faExclamationCircle,
  faSyncAlt,
  faUsers,
  faLayerGroup,
  faClock,
  faList,
  faCrown,
  faPlusCircle,
  faTrashAlt,
  faWrench,
  faCodeCompare,
  faBuildingColumns,
  faChartPie,
  faTags,
  faHourglassHalf,
  faCopy,
  faArrowRight
);

export function createSSRApplication() {
  const app = createSSRApp(App);
  const router = createRouterInstance();
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);
  app.component('FontAwesomeIcon', FontAwesomeIcon);
  return { app, router, pinia };
}
