<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEventsWarsStore } from '../stores/eventsWarsStore.js';

const store = useEventsWarsStore();
const { eventsData, warsData, isLoading, fetchError } = storeToRefs(store);

const activeTab = ref('events'); // 'events' | 'wars'

const eventsList = computed(() => {
  if (!eventsData.value || !Array.isArray(eventsData.value.events)) return [];
  return eventsData.value.events;
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
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

// Helper to inspect dynamic/unknown object keys for events
function getCustomKeys(eventObj) {
  if (!eventObj || typeof eventObj !== 'object') return [];
  const knownKeys = ['name', 'title', 'description', 'status', 'startTime', 'id', 'updatedAt'];
  return Object.keys(eventObj).filter((k) => !knownKeys.includes(k));
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

    <!-- Mode Selector Tabs -->
    <div class="flex border-b border-slate-800">
      <button
        :class="[
          'px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
          activeTab === 'events'
            ? 'border-b-2 border-indigo-500 text-indigo-400'
            : 'text-slate-400 hover:text-slate-200',
        ]"
        @click="activeTab = 'events'"
      >
        <font-awesome-icon icon="calendar-alt" class="mr-1.5" />
        Server Events ({{ eventsList.length }})
      </button>

      <button
        :class="[
          'px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
          activeTab === 'wars'
            ? 'border-b-2 border-red-500 text-red-400'
            : 'text-slate-400 hover:text-slate-200',
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
      <div
        v-if="eventsList.length === 0"
        class="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-center"
      >
        <font-awesome-icon icon="calendar-check" class="mb-3 text-4xl text-slate-600" />
        <h3 class="text-base font-bold text-slate-300">No Active Server Events</h3>
        <p class="mx-auto mt-1 max-w-md text-xs text-slate-500">
          There are currently no active events listed on ArcadiaMC. The bot background scanner runs
          every 2.5 minutes and will record & log any new events as soon as they are announced!
        </p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(ev, idx) in eventsList"
          :key="idx"
          class="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-indigo-500/40 hover:bg-slate-900"
        >
          <div class="flex items-start justify-between gap-2">
            <h4 class="text-sm font-bold text-slate-100 sm:text-base">
              {{ ev.name || ev.title || `Event #${idx + 1}` }}
            </h4>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              :class="
                ev.status === 'Active'
                  ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                  : 'border border-blue-500/30 bg-blue-500/20 text-blue-400'
              "
            >
              {{ ev.status || 'Active' }}
            </span>
          </div>

          <p class="mt-2 line-clamp-3 text-xs text-slate-400">
            {{ ev.description || 'No description provided for this server event.' }}
          </p>

          <div class="mt-4 space-y-1 border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
            <div v-if="ev.startTime" class="flex justify-between">
              <span class="text-slate-500">Start Time:</span>
              <span class="font-mono text-slate-300">{{ formatTimestamp(ev.startTime) }}</span>
            </div>

            <!-- Dynamic Schema Renderer for unknown / custom attributes -->
            <div v-for="key in getCustomKeys(ev)" :key="key" class="flex justify-between">
              <span class="text-slate-500 capitalize">{{ key.replace(/_/g, ' ') }}:</span>
              <span class="font-mono text-slate-300">{{ ev[key] }}</span>
            </div>
          </div>
        </div>
      </div>
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
