import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

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
  faShop
);

const app = createApp(App);
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');
