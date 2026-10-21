<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useEventsWarsStore } from '../stores/eventsWarsStore.js';
import { useTownyStore } from '../stores/townyStore.js';

const router = useRouter();
const store = useEventsWarsStore();
const townyStore = useTownyStore();
const { eventsData, warsData, isLoading, fetchError } = storeToRefs(store);

const activeTab = ref('events'); // 'events' | 'wars'

// Refs for tab indicator animation
const eventsTabRef = ref(null);
const warsTabRef = ref(null);

const mainTabIndicatorStyle = computed(() => {
  if (activeTab.value === 'events') {
    return {
      left: '0px',
      width: eventsTabRef.value ? `${eventsTabRef.value.offsetWidth}px` : '140px',
    };
  } else {
    const leftOffset = eventsTabRef.value ? eventsTabRef.value.offsetWidth : 140;
    return {
      left: `${leftOffset}px`,
      width: warsTabRef.value ? `${warsTabRef.value.offsetWidth}px` : '180px',
    };
  }
});

// Cookie & Storage helpers
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function setCookie(name, value, days = 365) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  try {
    localStorage.setItem(name, value);
  } catch {
    // ignore
  }
}

function loadSavedLimit() {
  const fromCookie = getCookie('events_display_limit');
  if (fromCookie) return fromCookie;
  try {
    const fromStorage = localStorage.getItem('events_display_limit');
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }
  return '20'; // default
}

const limitOptions = ['10', '20', '50', '100', 'max'];
const selectedLimit = ref(loadSavedLimit());

function setLimitOption(opt) {
  selectedLimit.value = opt;
  setCookie('events_display_limit', opt, 365);
}

const limitPillStyle = computed(() => {
  const idx = limitOptions.indexOf(selectedLimit.value);
  const activeIdx = idx >= 0 ? idx : 1;
  const stepPercent = 100 / limitOptions.length;
  return {
    left: `calc(${activeIdx * stepPercent}% + 2px)`,
    width: `calc(${stepPercent}% - 4px)`,
  };
});

const eventsList = computed(() => {
  const liveEvents = Array.isArray(eventsData.value?.events) ? eventsData.value.events : [];
  const storedEvents = Array.isArray(eventsData.value?.storedEvents)
    ? eventsData.value.storedEvents
    : [];

  const combined = [];
  const seenHashes = new Set();

  const getTs = (item) =>
    Number(
      item.timestamp || item.startTime || (item.createdAt ? new Date(item.createdAt).getTime() : 0)
    );

  for (const ev of [...liveEvents, ...storedEvents]) {
    const ts = getTs(ev);
    const key = `${ts}_${ev.type || ev.name || ''}_${ev.message || ev.title || ''}`;
    if (!seenHashes.has(key)) {
      seenHashes.add(key);
      combined.push(ev);
    }
  }

  // Sort strictly newest to oldest (timestamp descending)
  combined.sort((a, b) => getTs(b) - getTs(a));
  return combined;
});

const displayedEvents = computed(() => {
  const list = eventsList.value;
  if (selectedLimit.value === 'max') return list;
  const num = parseInt(selectedLimit.value, 10);
  return isNaN(num) ? list : list.slice(0, num);
});

const isWarTime = computed(() => !!warsData.value?.warTime);
const isWarEnabled = computed(() => !!warsData.value?.enabled);
const activeWars = computed(() =>
  Array.isArray(warsData.value?.activeWars) ? warsData.value.activeWars : []
);
const recentEvents = computed(() =>
  Array.isArray(warsData.value?.recentEvents) ? warsData.value.recentEvents : []
);

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  try {
    const num = Number(ts);
    const d = isNaN(num) ? new Date(ts) : new Date(num);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  try {
    const num = Number(ts);
    const timeMs = isNaN(num) ? new Date(ts).getTime() : num;
    const diffSec = Math.floor((Date.now() - timeMs) / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

function getTypeBadgeClass(type, status) {
  if (!type && status) {
    return status === 'Active'
      ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
      : 'border border-blue-500/30 bg-blue-500/20 text-blue-400';
  }
  const t = String(type || '').toLowerCase();
  if (t.includes('delete') || t.includes('destroy') || t.includes('ruined')) {
    return 'border border-rose-500/30 bg-rose-500/20 text-rose-400';
  }
  if (t.includes('create') || t.includes('found')) {
    return 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400';
  }
  return 'border border-indigo-500/30 bg-indigo-500/20 text-indigo-400';
}

function getEventIcon(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('delete') || t.includes('ruined')) return 'trash-alt';
  if (t.includes('create') || t.includes('found')) return 'plus-circle';
  if (t.includes('nation')) return 'flag';
  return 'bell';
}

function extractTownAndNation(ev) {
  if (!ev) return { townName: null, nationName: null };
  let dataObj = ev.data;
  if (typeof dataObj === 'string') {
    try {
      dataObj = JSON.parse(dataObj);
    } catch {
      dataObj = null;
    }
  }

  let townName = null;
  if (typeof dataObj?.town === 'string') {
    townName = dataObj.town;
  } else if (typeof dataObj?.town === 'object' && dataObj?.town?.name) {
    townName = dataObj.town.name;
  } else if (dataObj?.townName) {
    townName = dataObj.townName;
  }

  let nationName = null;
  if (typeof dataObj?.nation === 'string') {
    nationName = dataObj.nation;
  } else if (typeof dataObj?.nation === 'object' && dataObj?.nation?.name) {
    nationName = dataObj.nation.name;
  } else if (dataObj?.nationName) {
    nationName = dataObj.nationName;
  }

  const msg = ev.message || ev.name || ev.title || '';
  if (!townName) {
    const townMatch = msg.match(/(?:Town|town)\s+([A-Za-z0-9_äöüÄÖÜáéíóúÁÉÍÓÚ-]+)/i);
    if (townMatch) townName = townMatch[1];
  }
  if (!nationName) {
    const nationMatch = msg.match(/(?:Nation|nation)\s+([A-Za-z0-9_äöüÄÖÜáéíóúÁÉÍÓÚ-]+)/i);
    if (nationMatch) nationName = nationMatch[1];
  }

  return { townName, nationName };
}

function getEventMayorName(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.oldMayorName && !/^npc[-_]?\d+$/i.test(data.oldMayorName)) {
    return data.oldMayorName;
  }
  const mayorName = data.mayor?.name;
  if (mayorName && !/^npc[-_]?\d+$/i.test(mayorName)) {
    return mayorName;
  }
  return null;
}

function handleCardClick(ev) {
  const { townName, nationName } = extractTownAndNation(ev);
  if (townName) {
    goToTown(townName);
  } else if (nationName) {
    goToNation(nationName);
  }
}

function goToTown(name) {
  if (!name) return;
  const cleanName = String(name).trim();
  townyStore.activeTab = 'towns';
  townyStore.searchQuery = cleanName;
  if (!townyStore.townyData) {
    townyStore.fetchTownyData();
  }
  router.push({ path: '/towny', query: { tab: 'towns', search: cleanName } });
}

function goToNation(name) {
  if (!name) return;
  const cleanName = String(name).trim();
  townyStore.activeTab = 'nations';
  townyStore.searchQuery = cleanName;
  if (!townyStore.townyData) {
    townyStore.fetchTownyData();
  }
  router.push({ path: '/towny', query: { tab: 'nations', search: cleanName } });
}

onMounted(() => {
  store.fetchEventsAndWars();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Section Header & Controls -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="flex items-center gap-2 text-xl font-bold text-slate-100 sm:text-2xl">
          <font-awesome-icon icon="flag" class="text-indigo-400" />
          Events & War Telemetry
        </h2>
        <p class="text-xs text-slate-400 sm:text-sm">
          Live monitoring of server-wide events, war time status, active sieges, and historical
          logs.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          :disabled="isLoading"
          @click="store.fetchEventsAndWars()"
        >
          <font-awesome-icon icon="sync-alt" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Mode Selector Tabs with Animated Sliding Underline -->
    <div class="relative flex border-b border-slate-800">
      <!-- Animated Sliding Underline -->
      <div
        class="absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out"
        :class="
          activeTab === 'events'
            ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]'
            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
        "
        :style="mainTabIndicatorStyle"
      ></div>

      <button
        ref="eventsTabRef"
        :class="[
          'relative z-10 px-4 py-2.5 text-xs font-bold transition-colors duration-200 sm:text-sm',
          activeTab === 'events' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200',
        ]"
        @click="activeTab = 'events'"
      >
        <font-awesome-icon icon="calendar-alt" class="mr-1.5" />
        Server Events ({{ eventsList.length }})
      </button>

      <button
        ref="warsTabRef"
        :class="[
          'relative z-10 px-4 py-2.5 text-xs font-bold transition-colors duration-200 sm:text-sm',
          activeTab === 'wars' ? 'text-red-400' : 'text-slate-400 hover:text-slate-200',
        ]"
        @click="activeTab = 'wars'"
      >
        <font-awesome-icon icon="shield-alt" class="mr-1.5" />
        War & Siege Telemetry
        <span
          v-if="isWarTime"
          class="ml-1.5 rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400"
        >
          WAR TIME ACTIVE
        </span>
      </button>
    </div>

    <!-- Error Alert -->
    <div
      v-if="fetchError"
      class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
    >
      <font-awesome-icon icon="exclamation-circle" class="mr-2" />
      {{ fetchError }}
    </div>

    <!-- ── TAB 1: SERVER EVENTS ────────────────────────────────────────── -->
    <div v-if="activeTab === 'events'" class="space-y-4">
      <!-- Toolbar Controls: Counter & Max Display Limit Selector with Animated Sliding Pill -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-2 text-xs text-slate-300">
          <font-awesome-icon icon="list" class="text-indigo-400" />
          <span>
            Showing <strong>{{ displayedEvents.length }}</strong> of
            <strong>{{ eventsList.length }}</strong> events (Newest to Oldest)
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">Max Display:</span>
          <div
            class="relative flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5"
          >
            <!-- Dynamic Animated Sliding Highlight Pill -->
            <div
              class="absolute top-0.5 bottom-0.5 rounded-md bg-indigo-600 shadow-sm transition-all duration-300 ease-out"
              :style="limitPillStyle"
            ></div>

            <button
              v-for="opt in limitOptions"
              :key="opt"
              :class="[
                'relative z-10 w-12 py-1 text-center text-xs font-bold transition-colors duration-200',
                selectedLimit === opt ? 'text-white' : 'text-slate-400 hover:text-slate-200',
              ]"
              @click="setLimitOption(opt)"
            >
              {{ opt === 'max' ? 'Max' : opt }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="displayedEvents.length === 0"
        class="rounded-xl border border-slate-800/80 bg-slate-900/40 p-8 text-center text-xs text-slate-500"
      >
        No server events recorded yet.
      </div>

      <!-- Horizontal Cards Layout with TransitionGroup Animations -->
      <TransitionGroup v-else name="event-list" tag="div" class="space-y-3">
        <div
          v-for="(ev, idx) in displayedEvents"
          :key="ev.id || ev.eventHash || idx"
          :class="[
            'group flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-slate-900 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] md:flex-row md:items-center',
            extractTownAndNation(ev).townName || extractTownAndNation(ev).nationName
              ? 'cursor-pointer'
              : '',
          ]"
          @click="handleCardClick(ev)"
        >
          <!-- Left side: Badge + Title / Message + Inline Details Pills -->
          <div class="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <!-- Type Badge -->
            <span
              class="shrink-0 self-start rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase transition-transform group-hover:scale-105 sm:self-center"
              :class="getTypeBadgeClass(ev.type, ev.status)"
            >
              <font-awesome-icon :icon="getEventIcon(ev.type)" class="mr-1.5" />
              {{ ev.type ? ev.type.replace(/_/g, ' ') : ev.status || 'Event' }}
            </span>

            <!-- Main Title & Details -->
            <div class="space-y-1">
              <h4
                class="text-sm font-bold text-slate-100 transition-colors group-hover:text-indigo-300 sm:text-base"
              >
                {{ ev.message || ev.name || ev.title || `Event #${idx + 1}` }}
              </h4>

              <p v-if="ev.description" class="text-xs text-slate-400">
                {{ ev.description }}
              </p>

              <!-- Inline Metadata Pills & Town/Nation Cross-Links -->
              <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <!-- Interactive Town Link Button -->
                <button
                  v-if="extractTownAndNation(ev).townName"
                  class="inline-flex items-center gap-1 rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-300 transition-all hover:scale-105 hover:border-indigo-400 hover:bg-indigo-500/20 hover:text-white"
                  title="View Town details in Towny Monitor"
                  @click.stop="goToTown(extractTownAndNation(ev).townName)"
                >
                  <font-awesome-icon icon="cube" class="text-[10px] text-indigo-400" />
                  Town: {{ extractTownAndNation(ev).townName }}
                  <font-awesome-icon icon="globe" class="ml-0.5 text-[9px] opacity-70" />
                </button>

                <!-- Interactive Nation Link Button -->
                <button
                  v-if="extractTownAndNation(ev).nationName"
                  class="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-300 transition-all hover:scale-105 hover:border-amber-400 hover:bg-amber-500/20 hover:text-white"
                  title="View Nation details in Towny Monitor"
                  @click.stop="goToNation(extractTownAndNation(ev).nationName)"
                >
                  <font-awesome-icon icon="flag" class="text-[10px] text-amber-400" />
                  Nation: {{ extractTownAndNation(ev).nationName }}
                  <font-awesome-icon icon="globe" class="ml-0.5 text-[9px] opacity-70" />
                </button>

                <!-- Cause Pill -->
                <span
                  v-if="ev.data && typeof ev.data === 'object' && ev.data.cause"
                  class="inline-flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-rose-400"
                >
                  <font-awesome-icon icon="triangle-exclamation" class="text-[10px]" />
                  Cause: {{ ev.data.cause }}
                </span>

                <!-- Mayor Pill -->
                <span
                  v-if="getEventMayorName(ev.data)"
                  class="inline-flex items-center gap-1 rounded border border-slate-700/50 bg-slate-800 px-2 py-0.5 text-slate-300"
                >
                  <font-awesome-icon icon="crown" class="text-[10px] text-amber-400" />
                  Mayor: {{ getEventMayorName(ev.data) }}
                </span>

                <!-- King Pill -->
                <span
                  v-if="ev.data && typeof ev.data === 'object' && ev.data.king?.name"
                  class="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-300"
                >
                  <font-awesome-icon icon="crown" class="text-[10px] text-amber-400" />
                  King: {{ ev.data.king.name }}
                </span>

                <!-- Residents Pill -->
                <span
                  v-if="ev.data && typeof ev.data === 'object' && ev.data.town?.residents"
                  class="inline-flex items-center gap-1 rounded border border-slate-700/50 bg-slate-800 px-2 py-0.5 text-slate-400"
                >
                  <font-awesome-icon icon="users" class="text-[10px]" />
                  {{ ev.data.town.residents }} resident(s)
                </span>
              </div>
            </div>
          </div>

          <!-- Right side: Timestamp & Relative Time -->
          <div
            class="flex shrink-0 items-center justify-between border-t border-slate-800/80 pt-2 md:border-t-0 md:pt-0"
          >
            <div class="text-left md:text-right">
              <div class="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                <font-awesome-icon icon="clock" class="text-[11px] text-slate-500" />
                {{ formatTimestamp(ev.timestamp || ev.startTime || ev.createdAt) }}
              </div>
              <div class="mt-0.5 text-[10px] font-semibold text-indigo-400/90">
                {{ formatRelativeTime(ev.timestamp || ev.startTime || ev.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- ── TAB 2: WAR TELEMETRY ────────────────────────────────────────── -->
    <div v-if="activeTab === 'wars'" class="space-y-6">
      <!-- Status Overview Banner -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span class="text-xs font-semibold text-slate-400">War System</span>
          <div class="mt-1 flex items-center gap-2 text-lg font-bold text-slate-100">
            <span
              class="inline-block size-2.5 rounded-full"
              :class="
                isWarEnabled
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'bg-slate-500'
              "
            ></span>
            {{ isWarEnabled ? 'Enabled' : 'Disabled' }}
          </div>
        </div>

        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span class="text-xs font-semibold text-slate-400">War Time Mode</span>
          <div
            class="mt-1 text-lg font-bold"
            :class="isWarTime ? 'text-red-400' : 'text-slate-400'"
          >
            {{ isWarTime ? '🟢 Active' : '🔴 Inactive' }}
          </div>
        </div>

        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span class="text-xs font-semibold text-slate-400">Active Conflicts</span>
          <div class="mt-1 text-lg font-bold text-slate-100">
            {{ activeWars.length }} Active Wars
          </div>
        </div>
      </div>

      <!-- Active Wars List -->
      <div class="space-y-3">
        <h3 class="flex items-center gap-2 text-base font-bold text-slate-200">
          <font-awesome-icon icon="crosshairs" class="text-red-400" />
          Active Wars ({{ activeWars.length }})
        </h3>

        <div
          v-if="activeWars.length === 0"
          class="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 text-center text-xs text-slate-500"
        >
          No ongoing nation wars currently active.
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="(w, idx) in activeWars"
            :key="idx"
            class="rounded-xl border border-red-500/20 bg-slate-900/80 p-4"
          >
            <div class="flex items-center justify-between text-sm font-bold text-slate-200">
              <span class="text-red-400">{{ w.attacker || 'Attacker' }}</span>
              <span class="text-xs text-slate-500">VS</span>
              <span class="text-blue-400">{{ w.defender || 'Defender' }}</span>
            </div>
            <div
              v-if="w.score !== undefined"
              class="mt-2 text-center font-mono text-xs text-slate-400"
            >
              Score: {{ w.score }}
            </div>
          </div>
        </div>
      </div>

      <!-- Recent War Events Log -->
      <div class="space-y-3">
        <h3 class="flex items-center gap-2 text-base font-bold text-slate-200">
          <font-awesome-icon icon="scroll" class="text-amber-400" />
          Recent Military Logs ({{ recentEvents.length }})
        </h3>

        <div
          v-if="recentEvents.length === 0"
          class="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 text-center text-xs text-slate-500"
        >
          No recent military events logged.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(e, idx) in recentEvents"
            :key="idx"
            class="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs"
          >
            <span
              class="shrink-0 rounded border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-400"
            >
              {{ e.type || 'EVENT' }}
            </span>
            <div class="text-slate-300">
              {{ e.message || e.description || JSON.stringify(e) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-list-move,
.event-list-enter-active,
.event-list-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.event-list-enter-from,
.event-list-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
