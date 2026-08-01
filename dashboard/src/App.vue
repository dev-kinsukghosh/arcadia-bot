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

function navigate(path) {
  const targetPath = path === '/' || path === '' ? '/live-market' : path;
  window.history.pushState({}, '', targetPath);
  currentRoute.value = targetPath;
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
  });
});
</script>

<template>
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
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
        >
          <font-awesome-icon icon="coins" />
          Live Currency Market
        </button>
        <button
          @click.prevent="navigate('/currency-history')"
          :class="
            currentRoute === '/currency-history'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
        >
          <font-awesome-icon icon="chart-line" />
          Currency History
        </button>
        <button
          @click.prevent="navigate('/exchange')"
          :class="
            currentRoute === '/exchange'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
        >
          <font-awesome-icon icon="calculator" />
          Exchange
        </button>
        <button
          @click.prevent="navigate('/convoy')"
          :class="
            currentRoute === '/convoy'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
        >
          <font-awesome-icon icon="cube" />
          Convoy Shop
        </button>
        <button
          @click.prevent="navigate('/towny')"
          :class="
            currentRoute === '/towny'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
        >
          <font-awesome-icon icon="globe" />
          Towny
        </button>
        <button
          @click.prevent="navigate('/shops')"
          :class="
            currentRoute === '/shops'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
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

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center space-y-4 py-24">
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

      <!-- Dashboard Pages -->
      <div v-else-if="!isLoading">
        <Transition name="fade" mode="out-in">
          <div :key="currentRoute" class="space-y-6">
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
      </div>
    </main>

    <!-- Footer -->
    <footer
      class="border-t border-slate-900 bg-[#090b11] px-6 py-6 text-center text-xs text-slate-500"
    >
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div>ArcadiaMC Community Bot. Built by webdevkin</div>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"></span>
            System Online
          </span>
          <span class="font-mono text-[10px]">v1.1.5</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #334155;
}

/* Premium Tab Fade & Slide Animation */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
