<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import MarketMonitor from './components/MarketMonitor.vue';
import HistoryChart from './components/HistoryChart.vue';
import ExchangeCalculator from './components/ExchangeCalculator.vue';
import ConvoyStock from './components/ConvoyStock.vue';
import TownyMonitor from './components/TownyMonitor.vue';
import ShopsMonitor from './components/ShopsMonitor.vue';

// Retrieve API URL from Vite environment variables (falls back to relative path '')
const API_BASE = import.meta.env.VITE_API_URL || '';

// --- DEVICE FINGERPRINTING & API SETUP ---
function initDeviceFingerprint() {
  let fingerprint = localStorage.getItem('X-Device-Fingerprint');
  if (!fingerprint) {
    const randomHex = () => Math.random().toString(16).substring(2, 10);
    fingerprint = `dev_${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}`;
    localStorage.setItem('X-Device-Fingerprint', fingerprint);
  }
  axios.defaults.headers.common['X-Device-Fingerprint'] = fingerprint;
}

// --- STATE MANAGEMENT ---
const currentRoute = ref(window.location.pathname);

if (currentRoute.value === '/' || currentRoute.value === '' || currentRoute.value === '/monitor') {
  window.history.replaceState({}, '', '/live-market');
  currentRoute.value = '/live-market';
}

function smoothScrollToTop(duration = 600) {
  const start = window.scrollY || window.pageYOffset;
  const startTime = 'now' in window.performance ? performance.now() : new Date().getTime();

  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

  const animateScroll = (time) => {
    const timeElapsed = time - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    window.scrollTo(0, start + (-start) * easedProgress);

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
}

function navigate(path) {
  const targetPath = path === '/' || path === '' ? '/live-market' : path;
  window.history.pushState({}, '', targetPath);
  currentRoute.value = targetPath;
  smoothScrollToTop(600);
}
const currenciesStats = ref([]);
const isLoading = ref(true);
const fetchError = ref(null);

// --- API FETCHING ---
async function fetchLatestStats() {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const savedMarketDays = localStorage.getItem('market:days');
    const parsedMarketDays = savedMarketDays ? parseInt(savedMarketDays, 10) : 30;
    const limit = isNaN(parsedMarketDays) ? 30 : parsedMarketDays;

    const res = await axios.get(`${API_BASE}/currencies/stats?days=${limit}`);
    currenciesStats.value = res.data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    fetchError.value = 'Failed to fetch currency records. Is the bot server online?';
  } finally {
    isLoading.value = false;
  }
}

// Establish WebSocket connection for real-time updates
let socket = null;
function initWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let wsUrl = '';

  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.startsWith('http')) {
    wsUrl = envApiUrl.replace(/^http/, 'ws');
  } else {
    // Falls back to same origin host
    wsUrl = `${wsProtocol}//${window.location.host}`;
  }

  console.log(`Connecting to WebSocket: ${wsUrl}`);

  if (socket) {
    try {
      socket.close();
    } catch {
      // ignore
    }
  }

  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'update') {
        console.log('Real-time currency rates update received via WebSocket!');
        fetchLatestStats();
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  };

  socket.onclose = () => {
    console.warn('WebSocket connection closed. Retrying in 5 seconds...');
    setTimeout(initWebSocket, 5000);
  };

  socket.onerror = (err) => {
    console.error('WebSocket connection error:', err);
    try {
      socket.close();
    } catch {
      // ignore
    }
  };
}

const openBotInvite = () => {
  window.open(
    'https://discord.com/oauth2/authorize?client_id=1520676295187632318',
    '_blank',
    'noopener,noreferrer'
  );
};

onMounted(() => {
  initDeviceFingerprint();
  fetchLatestStats();
  initWebSocket();
  window.addEventListener('popstate', () => {
    let path = window.location.pathname;
    if (path === '/' || path === '' || path === '/monitor') {
      window.history.replaceState({}, '', '/live-market');
      path = '/live-market';
    }
    currentRoute.value = path;
    smoothScrollToTop(600);
  });
});
</script>

<template class="scroll-smooth">
  <div
    class="flex min-h-screen flex-col bg-[#07080c] font-sans text-slate-100 selection:bg-blue-600 selection:text-white"
  >
    <!-- Navbar Header -->
    <header
      class="sticky top-0 z-50 flex flex-col items-center justify-between gap-4 border-b border-slate-900 bg-[#090b11] px-6 py-4 shadow-md sm:flex-row md:px-12"
    >
      <div class="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="ArcadiaMC Logo"
          class="h-12 w-12 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.25)]"
        />
        <div>
          <h1
            class="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-lg font-bold tracking-tight text-transparent"
          >
            ArcadiaMC Stats Panel
          </h1>
          <span class="text-[10px] font-semibold tracking-widest text-slate-500 uppercase"
            >Community Stats Dashboard</span
          >
        </div>
      </div>

      <nav class="flex items-center gap-1 rounded-xl border border-slate-900 bg-slate-950/80 p-1">
        <button
          @click.prevent="navigate('/live-market')"
          :class="
            currentRoute === '/live-market' || currentRoute === '/monitor'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          "
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <font-awesome-icon icon="coins" />
          Live Currency Market
        </button>
        <button
          @click.prevent="navigate('/currency-history')"
          :class="
            currentRoute === '/currency-history'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          "
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <font-awesome-icon icon="chart-line" />
          Currency History
        </button>
        <button
          @click.prevent="navigate('/exchange')"
          :class="
            currentRoute === '/exchange'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          "
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <font-awesome-icon icon="calculator" />
          Exchange
        </button>
        <button
          @click.prevent="navigate('/convoy')"
          :class="
            currentRoute === '/convoy'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <font-awesome-icon icon="cube" />
          Convoy Shop
        </button>
        <button
          @click.prevent="navigate('/towny')"
          :class="
            currentRoute === '/towny'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <font-awesome-icon icon="globe" />
          Towny
        </button>
        <button
          @click.prevent="navigate('/shops')"
          :class="
            currentRoute === '/shops'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <font-awesome-icon icon="shop" />
          Player Shops
        </button>
      </nav>
    </header>

    <!-- Main Workspace -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-6 py-8 md:px-12">
      <!-- Error Alert -->
      <div
        v-if="fetchError"
        class="mb-6 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-400 shadow-md"
      >
        <font-awesome-icon icon="circle-exclamation" class="mt-0.5 text-red-400" />
        <div>
          <h4 class="text-sm font-bold">Synchronicity Issue</h4>
          <p class="mt-0.5 text-xs leading-relaxed text-red-400/90">{{ fetchError }}</p>
        </div>
      </div>

      <!-- Dashboard Pages / Loading Wrapper -->
      <Transition name="fade" mode="out-in" appear>
        <!-- Loading State -->
        <div v-if="isLoading" key="loading" class="flex flex-col items-center justify-center space-y-4 py-24">
          <div
            class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"
          ></div>
          <div class="text-center">
            <h4 class="text-sm font-semibold text-slate-300">Synchronizing Telemetry Nodes</h4>
            <p class="mt-1 text-xs text-slate-500">
              Connecting to API and loading MySQL database averages...
            </p>
          </div>
        </div>

        <!-- Loaded Content -->
        <div v-else :key="currentRoute" class="space-y-6">
          <div v-if="currentRoute === '/live-market' || currentRoute === '/monitor'">
            <MarketMonitor
              :currencies="currenciesStats"
              :api-base="API_BASE"
              @refresh-stats="fetchLatestStats"
            />
          </div>

          <!-- ================= CURRENCY HISTORY TAB ================= -->
          <div v-if="currentRoute === '/currency-history'">
            <HistoryChart :currencies="currenciesStats" :api-base="API_BASE" />
          </div>

          <!-- ================= EXCHANGE TAB ================= -->
          <div v-if="currentRoute === '/exchange'">
            <ExchangeCalculator :currencies="currenciesStats" />
          </div>

          <!-- ================= CONVOY TAB ================= -->
          <div v-if="currentRoute === '/convoy'">
            <ConvoyStock :api-base="API_BASE" />
          </div>

          <!-- ================= TOWNY TAB ================= -->
          <div v-if="currentRoute === '/towny'">
            <TownyMonitor :api-base="API_BASE" />
          </div>

          <!-- ================= SHOPS TAB ================= -->
          <div v-if="currentRoute === '/shops'">
            <ShopsMonitor :api-base="API_BASE" />
          </div>
        </div>
      </Transition>
    </main>

    <!-- Footer -->
    <footer
      class="border-t border-slate-900 bg-[#090b11] px-6 py-6 text-center text-xs text-slate-500"
    >
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div>ArcadiaMC Community Bot. Built by webdevkin</div>
        <div class="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
          <span class="flex items-center gap-1">
            <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"></span>
            System Online
          </span>
          <span class="font-mono text-[10px]">v1.1.5</span>
          <button
            @click="openBotInvite"
            class="relative flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all duration-300 hover:scale-105 hover:border-indigo-400 active:scale-95 group overflow-hidden animate-pulse-glow"
            title="Add Discord Bot to your Guild"
          >
            <!-- Shine transition overlay -->
            <span class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine"></span>

            <!-- Discord SVG Icon -->
            <svg class="h-3.5 w-3.5 fill-current transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.4-5c.87-.64,1.71-1.32,2.51-2a75.46,75.46,0,0,0,72.6,0c.8,0.7,1.64,1.38,2.51,2a68.18,68.18,0,0,1-10.4,5,77.63,77.63,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.24,49.25,123,26.47,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
            </svg>
            <span>Add Bot</span>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Global scrollbar disabling */
html {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar,
*::-webkit-scrollbar {
  display: none !important;
}

/* Premium Tab Fade & Slide Animation */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* Card switch transition animation (0.5s fade and scale/slide) */
.card-switch-enter-active,
.card-switch-leave-active {
  transition:
    opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-switch-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}
.card-switch-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.98);
}

/* Premium Card Pop Out Stagger Animation */
.card-pop-enter-active {
  transition: opacity var(--duration, 0.5s) cubic-bezier(0.34, 1.56, 0.64, 1),
              transform var(--duration, 0.5s) cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--card-idx, 0) * 0.05s);
  --duration: calc(max(0.15s, 0.5s - var(--card-idx, 0) * 0.05s));
}
.card-pop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.card-pop-enter-from {
  opacity: 0;
  transform: scale(0.85) translateY(12px);
}
.card-pop-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-12px);
}
.card-pop-move {
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1) !important;
}

/* Premium custom keyframe animations */
@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shine {
  animation: shine 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.8), 0 0 10px rgba(168, 85, 247, 0.4);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 3s infinite;
}
</style>
