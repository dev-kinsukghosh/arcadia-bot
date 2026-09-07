<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayersStore } from '../stores/playersStore.js';

const props = defineProps({
  apiBase: {
    type: String,
    required: true,
  },
});

const playersStore = usePlayersStore();
const { playersData, isLoading, fetchError, searchQuery, rankFilter, selectedPlayer, isModalOpen } =
  storeToRefs(playersStore);

// Navigation sub-views: 'roster' (Combined Roster), 'analytics' (Rank & Town Analytics)
const activeSubTab = ref('roster');
// Status filter: 'all', 'online', 'offline'
const statusFilter = ref('all');

onMounted(() => {
  if (!playersData.value) {
    playersStore.fetchPlayersData();
  }
});

const failedAvatars = ref({});
function handleAvatarError(key) {
  failedAvatars.value[key] = true;
}

// Copy coordinates to clipboard
const copiedText = ref(null);
function copyCoordinates(world, x, y, z) {
  const text = `${world}: ${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      copiedText.value = text;
      setTimeout(() => {
        copiedText.value = null;
      }, 2000);
    });
  }
}

function getPlayerColor(name) {
  if (!name) return 'from-blue-500 to-indigo-600 border-blue-500/20 text-blue-100';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-blue-500 to-indigo-600 border-blue-500/20 text-blue-100',
    'from-emerald-500 to-teal-600 border-emerald-500/20 text-emerald-100',
    'from-amber-500 to-orange-600 border-amber-500/20 text-amber-100',
    'from-rose-500 to-pink-600 border-rose-500/20 text-rose-100',
    'from-violet-500 to-purple-600 border-violet-500/20 text-violet-100',
    'from-cyan-500 to-sky-600 border-cyan-500/20 text-cyan-100',
    'from-fuchsia-500 to-pink-600 border-fuchsia-500/20 text-fuchsia-100',
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function getPlayerInitials(name) {
  if (!name) return '??';
  return name.substring(0, 2).toUpperCase();
}

function cleanName(name) {
  if (!name) return '';
  return name.replace(/_/g, ' ');
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Available ranks list for filter dropdown
const availableRanks = computed(() => {
  if (!playersData.value) return [];
  const set = new Set();
  if (Array.isArray(playersData.value.players)) {
    playersData.value.players.forEach((p) => p.rank && set.add(p.rank.toUpperCase()));
  }
  if (Array.isArray(playersData.value.profiles)) {
    playersData.value.profiles.forEach((p) => p.rank && set.add(p.rank.toUpperCase()));
  }
  return [...set].sort();
});

// Processed Roster: Online at TOP (A-Z), Offline at BOTTOM (A-Z)
const processedRoster = computed(() => {
  if (!playersData.value) return [];

  const onlineList = Array.isArray(playersData.value.players) ? playersData.value.players : [];
  const dbProfiles = Array.isArray(playersData.value.profiles) ? playersData.value.profiles : [];

  const onlineNames = new Set(onlineList.map((p) => p.name?.toLowerCase()));

  // 1. Map Online Players
  const onlineMapped = onlineList.map((p) => ({
    name: p.name,
    displayName: p.displayName || p.name,
    uuid: p.uuid,
    rank: p.rank || 'PLAYER',
    isOnline: true,
    town: p.town,
    nation: p.nation,
    empire: p.empire,
    location: p.location,
    chatChannel: p.chatChannel,
  }));

  // Sort Online A-Z by account username
  onlineMapped.sort((a, b) => a.name.localeCompare(b.name));

  // 2. Map Offline Players (excluding currently online)
  const offlineMapped = [];
  dbProfiles.forEach((prof) => {
    if (prof.name && !onlineNames.has(prof.name.toLowerCase())) {
      offlineMapped.push({
        name: prof.name,
        displayName: prof.displayName || prof.name,
        uuid: prof.uuid,
        rank: prof.rank || 'PLAYER',
        isOnline: false,
        town: prof.townName ? { name: prof.townName } : null,
        nation: prof.nationName ? { name: prof.nationName } : null,
        empire: prof.empire,
        firstSeen: prof.firstSeen,
        lastSeen: prof.lastSeen,
      });
    }
  });

  // Sort Offline A-Z by account username
  offlineMapped.sort((a, b) => a.name.localeCompare(b.name));

  // Combine: Online at TOP (A-Z), Offline at BOTTOM (A-Z)
  let combined = [...onlineMapped, ...offlineMapped];

  // Apply Status Filter
  if (statusFilter.value === 'online') {
    combined = combined.filter((p) => p.isOnline);
  } else if (statusFilter.value === 'offline') {
    combined = combined.filter((p) => !p.isOnline);
  }

  // Apply Rank Filter
  if (rankFilter.value !== 'all') {
    combined = combined.filter(
      (p) => (p.rank || '').toUpperCase() === rankFilter.value.toUpperCase()
    );
  }

  // Apply Search Filter
  const query = searchQuery.value.toLowerCase().trim();
  if (query) {
    combined = combined.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const disp = (p.displayName || '').toLowerCase();
      const town = (p.town?.name || '').toLowerCase();
      const nation = (p.nation?.name || '').toLowerCase();
      return (
        name.includes(query) ||
        disp.includes(query) ||
        town.includes(query) ||
        nation.includes(query)
      );
    });
  }

  return combined;
});

// Rank distribution metrics
const rankDistribution = computed(() => {
  if (!playersData.value) return [];
  const counts = {};
  const onlineList = Array.isArray(playersData.value.players) ? playersData.value.players : [];
  const total = onlineList.length;

  onlineList.forEach((p) => {
    const r = (p.rank || 'PLAYER').toUpperCase();
    counts[r] = (counts[r] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([rank, count]) => ({
      rank,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
});

// Top towns by online player count
const topTownsByOnline = computed(() => {
  if (!playersData.value || !Array.isArray(playersData.value.players)) return [];
  const townCounts = {};

  playersData.value.players.forEach((p) => {
    if (p.town?.name) {
      const name = cleanName(p.town.name);
      townCounts[name] = (townCounts[name] || 0) + 1;
    }
  });

  return Object.entries(townCounts)
    .map(([town, count]) => ({ town, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Header Banner & Sub-Tabs -->
    <div
      class="flex flex-col gap-4 rounded-2xl border border-slate-900 bg-slate-950/80 p-5 shadow-xl md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h2 class="flex items-center gap-2.5 text-lg font-extrabold text-slate-100 sm:text-xl">
          <font-awesome-icon icon="users" class="text-blue-400" />
          ArcadiaMC Players Monitor
        </h2>
        <p class="mt-0.5 text-xs text-slate-400">
          Combined roster of online players (top A-Z) and recorded offline profiles (bottom A-Z).
        </p>
      </div>

      <!-- Navigation Sub-Tabs -->
      <div class="flex items-center gap-1 rounded-xl border border-slate-900 bg-slate-950 p-1">
        <button
          :class="
            activeSubTab === 'roster'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200"
          @click="activeSubTab = 'roster'"
        >
          <font-awesome-icon icon="users" class="text-xs" />
          <span>Player Roster</span>
        </button>
        <button
          :class="
            activeSubTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          "
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200"
          @click="activeSubTab = 'analytics'"
        >
          <font-awesome-icon icon="chart-line" class="text-xs" />
          <span>Analytics</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div
          class="size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
        ></div>
        <p class="text-xs font-bold text-slate-400">Loading player telemetry...</p>
      </div>
    </div>

    <!-- Global Error State -->
    <div
      v-else-if="fetchError"
      class="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-300"
    >
      <font-awesome-icon icon="triangle-exclamation" class="text-2xl" />
      <p class="mt-2 text-sm font-semibold">{{ fetchError }}</p>
    </div>

    <!-- Dynamic Content Views -->
    <Transition name="card-switch" mode="out-in" appear>
      <!-- VIEW 1: PLAYER ROSTER -->
      <div v-if="activeSubTab === 'roster'" key="tab-roster" class="space-y-6">
        <!-- Controls & Filter Bar -->
        <div
          class="flex flex-col gap-3 rounded-xl border border-slate-900 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3 text-xs">
            <span class="font-bold text-slate-300">
              Online:
              <strong class="font-mono text-sm text-emerald-400">{{
                playersData?.onlineCount ?? 0
              }}</strong>
            </span>
            <span class="text-slate-500">|</span>
            <span class="text-slate-400">
              Showing:
              <strong class="font-mono text-slate-100">{{ processedRoster.length }}</strong>
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Status Filter -->
            <select
              v-model="statusFilter"
              class="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online Only</option>
              <option value="offline">Offline Only</option>
            </select>

            <!-- Rank Filter -->
            <select
              v-model="rankFilter"
              class="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Ranks</option>
              <option v-for="r in availableRanks" :key="r" :value="r">
                {{ r }}
              </option>
            </select>

            <!-- Search Input -->
            <div class="relative w-full sm:w-56">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search username, nick..."
                class="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-3 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <font-awesome-icon
                icon="search"
                class="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-slate-500"
              />
            </div>

            <!-- Reset Button -->
            <button
              v-if="searchQuery || rankFilter !== 'all' || statusFilter !== 'all'"
              class="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200"
              @click="
                searchQuery = '';
                rankFilter = 'all';
                statusFilter = 'all';
              "
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Combined Player Cards Grid (Online top A-Z, Offline bottom A-Z) -->
        <TransitionGroup
          v-if="processedRoster.length > 0"
          name="card-list"
          tag="div"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <div
            v-for="player in processedRoster"
            :key="player.uuid || player.name"
            :class="
              player.isOnline
                ? 'border-slate-900 bg-slate-950/60 hover:border-emerald-500/30 hover:bg-slate-900/40 hover:shadow-emerald-500/5'
                : 'border-slate-900/60 bg-slate-950/30 opacity-80 hover:border-slate-700 hover:opacity-100'
            "
            class="group hover:scale-1.02 relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:shadow-lg"
            @click="playersStore.openPlayerModal(player)"
          >
            <div class="flex items-start gap-3">
              <!-- Player Avatar Skin Head -->
              <div
                :class="getPlayerColor(player.name)"
                class="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br text-sm font-black shadow-md"
              >
                <span class="z-0 text-xs select-none">{{ getPlayerInitials(player.name) }}</span>
                <img
                  v-if="!failedAvatars['player-' + player.name]"
                  :src="`${props.apiBase}/heads/${(player.name || 'steve').toLowerCase()}.png`"
                  alt="Skin Head"
                  class="absolute inset-0 z-10 size-full object-cover opacity-0 transition-opacity duration-300"
                  @load="$event.target.classList.remove('opacity-0')"
                  @error="handleAvatarError('player-' + player.name)"
                />
              </div>

              <!-- Player Names & Status -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3
                    class="truncate text-sm font-extrabold text-slate-100 transition-colors group-hover:text-blue-400"
                  >
                    {{ player.name }}
                  </h3>
                  <!-- Status Indicator -->
                  <span
                    :class="player.isOnline ? 'bg-emerald-500' : 'bg-slate-600'"
                    class="size-2 shrink-0 rounded-full"
                  ></span>
                </div>

                <!-- Nickname display -->
                <p
                  v-if="player.displayName && player.displayName !== player.name"
                  class="truncate text-[11px] font-medium text-slate-400"
                >
                  Nick: <span class="font-semibold text-blue-300">{{ player.displayName }}</span>
                </p>
                <p v-else class="truncate text-[10px] text-slate-500">Account Username</p>

                <!-- Status & Rank Badges -->
                <div class="mt-1 flex items-center gap-1.5">
                  <span
                    class="inline-block rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-300 uppercase"
                  >
                    {{ player.rank || 'PLAYER' }}
                  </span>
                  <span
                    :class="
                      player.isOnline
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-900/60 text-slate-500'
                    "
                    class="rounded-md border px-1.5 py-0.5 text-[8px] font-extrabold uppercase"
                  >
                    {{ player.isOnline ? 'ONLINE' : 'OFFLINE' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Affiliations & Location / Last Seen -->
            <div class="mt-4 space-y-1.5 border-t border-slate-900/60 pt-3 text-[10px]">
              <div class="flex items-center justify-between text-slate-400">
                <span>Town:</span>
                <span class="max-w-[120px] truncate font-bold text-slate-200">
                  {{ player.town?.name ? cleanName(player.town.name) : 'None' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-400">
                <span>Nation:</span>
                <span class="max-w-[120px] truncate font-bold text-indigo-400">
                  {{ player.nation?.name ? cleanName(player.nation.name) : 'None' }}
                </span>
              </div>

              <!-- Online: Coordinates -->
              <div
                v-if="player.isOnline && player.location?.world"
                class="flex items-center justify-between font-mono text-[9px] text-slate-500"
              >
                <span>Location:</span>
                <div class="flex items-center gap-1">
                  <span class="text-slate-400">
                    {{ player.location.world }} ({{ Math.round(player.location.x ?? 0) }},
                    {{ Math.round(player.location.z ?? 0) }})
                  </span>
                  <button
                    class="rounded bg-slate-900 px-1 py-0.5 text-[8px] font-bold text-slate-400 hover:text-blue-400"
                    @click.stop="
                      copyCoordinates(
                        player.location.world,
                        player.location.x,
                        player.location.y,
                        player.location.z
                      )
                    "
                  >
                    {{
                      copiedText ===
                      `${player.location.world}: ${Math.round(player.location.x)}, ${Math.round(player.location.y)}, ${Math.round(player.location.z)}`
                        ? '✓'
                        : 'Copy'
                    }}
                  </button>
                </div>
              </div>

              <!-- Offline: Last Seen -->
              <div
                v-else-if="!player.isOnline && player.lastSeen"
                class="flex items-center justify-between font-mono text-[9px] text-slate-500"
              >
                <span>Last Seen:</span>
                <span class="text-slate-400">
                  {{ formatDate(player.lastSeen) }}
                </span>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <!-- Empty Filter Results -->
        <div
          v-else
          class="rounded-2xl border border-slate-900 bg-slate-950/40 p-12 text-center text-slate-500"
        >
          <font-awesome-icon icon="users" class="text-3xl text-slate-700" />
          <p class="mt-3 text-sm font-semibold text-slate-400">No players found</p>
          <p class="mt-1 text-xs text-slate-500">
            Try adjusting your search query, status filter, or rank filter.
          </p>
        </div>
      </div>

      <!-- VIEW 2: ANALYTICS -->
      <div
        v-else-if="activeSubTab === 'analytics'"
        key="tab-analytics"
        class="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <!-- Rank Distribution -->
        <div class="space-y-4 rounded-2xl border border-slate-900 bg-slate-950/80 p-6 shadow-xl">
          <h3 class="flex items-center gap-2 text-sm font-extrabold text-slate-100">
            <font-awesome-icon icon="shield-halved" class="text-blue-400" />
            Online Player Rank Breakdown
          </h3>
          <div class="space-y-3">
            <div v-for="r in rankDistribution" :key="r.rank" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="font-bold text-slate-200">{{ r.rank }}</span>
                <span class="font-mono text-slate-400">{{ r.count }} player(s) ({{ r.pct }}%)</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  :style="{ width: r.pct + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Towns by Online Players -->
        <div class="space-y-4 rounded-2xl border border-slate-900 bg-slate-950/80 p-6 shadow-xl">
          <h3 class="flex items-center gap-2 text-sm font-extrabold text-slate-100">
            <font-awesome-icon icon="globe" class="text-emerald-400" />
            Top Towns by Online Roster
          </h3>
          <div class="space-y-2">
            <div
              v-for="(t, idx) in topTownsByOnline"
              :key="t.town"
              class="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/40 p-3 text-xs"
            >
              <div class="flex items-center gap-3">
                <span class="font-mono text-xs font-bold text-slate-500">#{{ idx + 1 }}</span>
                <span class="font-bold text-slate-200">{{ t.town }}</span>
              </div>
              <span
                class="rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400"
              >
                {{ t.count }} online
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Player Details Modal -->
    <Transition name="modal-fade-box">
      <div
        v-if="isModalOpen && selectedPlayer"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        @click.self="playersStore.closeModal()"
      >
        <div
          class="modal-box-anim w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-[#0b0e17] shadow-2xl"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-900 px-6 py-4">
            <div class="flex items-center gap-3">
              <div
                :class="getPlayerColor(selectedPlayer.name)"
                class="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br text-sm font-black shadow-md"
              >
                <span class="z-0 text-xs select-none">{{
                  getPlayerInitials(selectedPlayer.name)
                }}</span>
                <img
                  v-if="!failedAvatars['modal-player-' + selectedPlayer.name]"
                  :src="`${props.apiBase}/heads/${(selectedPlayer.name || 'steve').toLowerCase()}.png`"
                  alt="Skin Head"
                  class="absolute inset-0 z-10 size-full object-cover opacity-0 transition-opacity duration-300"
                  @load="$event.target.classList.remove('opacity-0')"
                  @error="handleAvatarError('modal-player-' + selectedPlayer.name)"
                />
              </div>
              <div>
                <h3 class="flex items-center gap-2 text-base font-extrabold text-slate-100">
                  {{ selectedPlayer.name }}
                  <span
                    :class="selectedPlayer.isOnline ? 'bg-emerald-500' : 'bg-slate-600'"
                    class="size-2 rounded-full"
                  ></span>
                </h3>
                <p class="text-xs text-slate-400">
                  <template
                    v-if="
                      selectedPlayer.displayName &&
                      selectedPlayer.displayName !== selectedPlayer.name
                    "
                  >
                    In-Game Nick:
                    <strong class="text-blue-300">{{ selectedPlayer.displayName }}</strong>
                  </template>
                  <template v-else>Account Username</template>
                </p>
              </div>
            </div>
            <button
              class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
              @click="playersStore.closeModal()"
            >
              <font-awesome-icon icon="times" class="text-lg" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="space-y-4 p-6">
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="rounded-xl border border-slate-900 bg-slate-950/60 p-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase">Username</span>
                <p class="mt-1 font-mono font-bold text-slate-200">{{ selectedPlayer.name }}</p>
              </div>
              <div class="rounded-xl border border-slate-900 bg-slate-950/60 p-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase">In-Game Nickname</span>
                <p class="mt-1 font-mono font-bold text-blue-400">
                  {{ selectedPlayer.displayName || selectedPlayer.name }}
                </p>
              </div>
              <div class="rounded-xl border border-slate-900 bg-slate-950/60 p-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase">Rank</span>
                <p class="mt-1 font-mono font-bold text-emerald-400">
                  {{ selectedPlayer.rank || 'PLAYER' }}
                </p>
              </div>
              <div class="rounded-xl border border-slate-900 bg-slate-950/60 p-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase">Status</span>
                <p
                  :class="selectedPlayer.isOnline ? 'text-emerald-400' : 'text-slate-400'"
                  class="mt-1 font-bold"
                >
                  {{ selectedPlayer.isOnline ? '🟢 ONLINE' : '⚪ OFFLINE' }}
                </p>
              </div>
            </div>

            <!-- Affiliations -->
            <div class="space-y-2 rounded-xl border border-slate-900 bg-slate-950/60 p-4 text-xs">
              <h4 class="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                Affiliations
              </h4>
              <div class="flex justify-between text-slate-300">
                <span>Town:</span>
                <strong class="text-slate-100">{{
                  selectedPlayer.town?.name ? cleanName(selectedPlayer.town.name) : 'None'
                }}</strong>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>Nation:</span>
                <strong class="text-indigo-400">{{
                  selectedPlayer.nation?.name ? cleanName(selectedPlayer.nation.name) : 'None'
                }}</strong>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>Empire:</span>
                <strong class="text-amber-400">{{ selectedPlayer.empire || 'None' }}</strong>
              </div>
            </div>

            <!-- Online Location Telemetry -->
            <div
              v-if="selectedPlayer.isOnline && selectedPlayer.location"
              class="space-y-1.5 rounded-xl border border-slate-900 bg-slate-950/60 p-4 font-mono text-xs"
            >
              <h4
                class="font-sans text-[10px] font-extrabold tracking-wider text-slate-500 uppercase"
              >
                Live Coordinates
              </h4>
              <p class="text-slate-300">
                • World: <strong class="text-slate-100">{{ selectedPlayer.location.world }}</strong>
              </p>
              <p class="text-slate-300">
                • Coords:
                <strong class="text-slate-100">
                  X: {{ Math.round(selectedPlayer.location.x ?? 0) }}, Y:
                  {{ Math.round(selectedPlayer.location.y ?? 0) }}, Z:
                  {{ Math.round(selectedPlayer.location.z ?? 0) }}
                </strong>
              </p>
              <p v-if="selectedPlayer.chatChannel" class="text-slate-300">
                • Chat Channel:
                <strong class="text-blue-400">{{ selectedPlayer.chatChannel }}</strong>
              </p>
            </div>

            <!-- Offline Timestamps -->
            <div
              v-else-if="!selectedPlayer.isOnline"
              class="space-y-1.5 rounded-xl border border-slate-900 bg-slate-950/60 p-4 font-mono text-xs"
            >
              <h4
                class="font-sans text-[10px] font-extrabold tracking-wider text-slate-500 uppercase"
              >
                Recorded History
              </h4>
              <p class="text-slate-300">
                • First Recorded:
                <strong class="text-slate-100">{{ formatDate(selectedPlayer.firstSeen) }}</strong>
              </p>
              <p class="text-slate-300">
                • Last Active:
                <strong class="text-slate-100">{{ formatDate(selectedPlayer.lastSeen) }}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Card Stagger & Transition Animations */
.card-list-enter-active,
.card-list-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-list-enter-from {
  opacity: 0;
  transform: scale(0.94) translateY(10px);
}
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.94) translateY(-10px);
}
.card-list-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Subview Tab Transitions */
.card-switch-enter-active,
.card-switch-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.card-switch-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.card-switch-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Modal Box Animations */
.modal-fade-box-enter-active,
.modal-fade-box-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-fade-box-enter-from,
.modal-fade-box-leave-to {
  opacity: 0;
}

.modal-box-anim {
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes modalPop {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(12px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
