<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useTownyStore } from '../stores/townyStore.js';

const props = defineProps({
  apiBase: {
    type: String,
    required: true,
  },
});

const townyStore = useTownyStore();
const {
  townyData,
  isLoading,
  fetchError,
  activeTab,
  searchQuery,
  sortBy,
  selectedTown,
  selectedNation,
} = storeToRefs(townyStore);

onMounted(() => {
  if (!townyData.value) {
    townyStore.fetchTownyData();
  }
});

// Format timestamp
function formatDate(timestamp) {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Clean names (replaces underscores with spaces)
function cleanName(name) {
  if (!name) return '';
  return name.replace(/_/g, ' ');
}

// Filtered and Sorted Towns list
const processedTowns = computed(() => {
  if (!townyData.value || !townyData.value.towns) return [];

  let result = [...townyData.value.towns];

  // Search filter
  const query = searchQuery.value.toLowerCase().trim();
  if (query) {
    result = result.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.mayor?.name || '').toLowerCase().includes(query) ||
        (t.nation?.name || '').toLowerCase().includes(query)
    );
  }

  // Sort logic
  result.sort((a, b) => {
    if (sortBy.value === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy.value === 'name_desc') {
      return (b.name || '').localeCompare(a.name || '');
    } else if (sortBy.value === 'residents_desc') {
      return (b.residents || 0) - (a.residents || 0);
    } else if (sortBy.value === 'residents_asc') {
      return (a.residents || 0) - (b.residents || 0);
    } else if (sortBy.value === 'claims_desc') {
      return (b.claims?.claimedChunks || 0) - (a.claims?.claimedChunks || 0);
    } else if (sortBy.value === 'claims_asc') {
      return (a.claims?.claimedChunks || 0) - (b.claims?.claimedChunks || 0);
    } else if (sortBy.value === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else if (sortBy.value === 'oldest') {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    return 0;
  });

  return result;
});

// Filtered and Sorted Nations list
const processedNations = computed(() => {
  if (!townyData.value || !townyData.value.nations) return [];

  let result = [...townyData.value.nations];

  // Search filter
  const query = searchQuery.value.toLowerCase().trim();
  if (query) {
    result = result.filter(
      (n) =>
        (n.name || '').toLowerCase().includes(query) ||
        (n.king?.name || '').toLowerCase().includes(query) ||
        (n.capital?.name || '').toLowerCase().includes(query)
    );
  }

  // Sort logic
  result.sort((a, b) => {
    if (sortBy.value === 'name_asc' || sortBy.value === 'residents_asc') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy.value === 'name_desc') {
      return (b.name || '').localeCompare(a.name || '');
    } else if (sortBy.value === 'residents_desc') {
      return (b.residents || 0) - (a.residents || 0);
    } else if (sortBy.value === 'towns_desc') {
      return (b.towns || 0) - (a.towns || 0);
    } else if (sortBy.value === 'allies_desc') {
      return (b.diplomacy?.alliesCount || 0) - (a.diplomacy?.alliesCount || 0);
    }
    return 0;
  });

  return result;
});

// Top 4 Towns (ranked by residents count descending)
const topTowns = computed(() => {
  if (!townyData.value || !townyData.value.towns) return [];
  return [...townyData.value.towns]
    .sort((a, b) => (b.residents || 0) - (a.residents || 0))
    .slice(0, 4);
});

// Top 4 Nations (ranked by residents count descending)
const topNations = computed(() => {
  if (!townyData.value || !townyData.value.nations) return [];
  return [...townyData.value.nations]
    .sort((a, b) => (b.residents || 0) - (a.residents || 0))
    .slice(0, 4);
});

const failedAvatars = ref({});

function handleAvatarError(key) {
  failedAvatars.value[key] = true;
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

function openTownDetails(town) {
  selectedTown.value = town;
}

function openNationDetails(nation) {
  selectedNation.value = nation;
}

function closeModals() {
  selectedTown.value = null;
  selectedNation.value = null;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Cards Summary -->
    <div v-if="townyData && townyData.counts" class="grid grid-cols-2 gap-4 md:grid-cols-5">
      <div
        class="relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-4 shadow-sm"
      >
        <div class="flex items-center gap-2 text-slate-500">
          <font-awesome-icon icon="globe" class="text-blue-500" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Total Towns</span>
        </div>
        <div class="mt-2 font-mono text-2xl font-extrabold text-slate-100">
          {{ townyData.counts.towns || 0 }}
        </div>
      </div>

      <div
        class="relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-4 shadow-sm"
      >
        <div class="flex items-center gap-2 text-slate-500">
          <font-awesome-icon icon="flag" class="text-indigo-500" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Total Nations</span>
        </div>
        <div class="mt-2 font-mono text-2xl font-extrabold text-slate-100">
          {{ townyData.counts.nations || 0 }}
        </div>
      </div>

      <div
        class="relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-4 shadow-sm"
      >
        <div class="flex items-center gap-2 text-slate-500">
          <font-awesome-icon icon="coins" class="text-emerald-500" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Residents</span>
        </div>
        <div class="mt-2 flex items-baseline gap-1.5 font-mono">
          <span class="text-2xl font-extrabold text-slate-100">{{
            townyData.counts.residents || 0
          }}</span>
          <span class="text-[10px] text-slate-500"
            >({{ townyData.counts.onlineResidents || 0 }} online)</span
          >
        </div>
      </div>

      <div
        class="relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-4 shadow-sm"
      >
        <div class="flex items-center gap-2 text-slate-500">
          <font-awesome-icon icon="cube" class="text-amber-500" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Claimed Chunks</span>
        </div>
        <div class="mt-2 font-mono text-2xl font-extrabold text-slate-100">
          {{ townyData.counts.claimedChunks?.total?.toLocaleString() || 0 }}
        </div>
      </div>

      <div
        class="col-span-2 relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-4 shadow-sm md:col-span-1"
      >
        <div class="flex items-center gap-2 text-slate-500">
          <font-awesome-icon icon="sliders" class="text-rose-500" />
          <span class="text-[10px] font-bold tracking-wider uppercase">In Nations</span>
        </div>
        <div class="mt-2 flex items-baseline gap-1.5 font-mono">
          <span class="text-2xl font-extrabold text-slate-100">{{
            townyData.counts.townsInNation || 0
          }}</span>
          <span class="text-[10px] text-slate-500"
            >({{ townyData.counts.townsNeutral || 0 }} neutral)</span
          >
        </div>
      </div>
    </div>

    <!-- Top 4 Performers Section (Towns or Nations depending on tab) -->
    <div v-if="townyData" class="mt-6">
      <Transition name="card-switch" mode="out-in" appear>
        <div v-if="activeTab === 'towns'" key="towns">
          <h3
            class="text-xs font-bold tracking-wider text-slate-500 uppercase mb-3 flex items-center gap-2"
          >
            <font-awesome-icon icon="globe" class="text-blue-500" />
            Top 4 Towns by Population
          </h3>
          <TransitionGroup
            tag="div"
            name="card-pop"
            appear
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div
              v-for="(town, idx) in topTowns"
              :key="'top-town-' + town.id"
              :style="{ '--card-idx': idx }"
              class="group cursor-pointer relative overflow-hidden rounded-xl border border-blue-500/10 bg-[#0c0d15]/50 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-blue-500/30 hover:bg-[#11131f]/70 shadow-sm"
              @click="openTownDetails(town)"
            >
              <!-- Badge indicators for rank -->
              <div
                class="absolute right-3 top-3 text-[10px] font-extrabold text-blue-500 bg-blue-500/10 border border-blue-500/25 rounded-md px-1.5 py-0.5"
              >
                Rank #{{ idx + 1 }}
              </div>

              <div class="flex items-center gap-3">
                <div
                  :class="getPlayerColor(town.mayor?.name)"
                  class="relative h-8 w-8 rounded-lg border border-slate-800 flex items-center justify-center font-bold text-[10px] bg-gradient-to-br overflow-hidden shadow-sm shrink-0"
                >
                  <span class="z-0 select-none text-[8px]">{{
                    getPlayerInitials(town.mayor?.name)
                  }}</span>
                  <img
                    v-if="!failedAvatars['top-town-' + town.id]"
                    :src="`${props.apiBase}/heads/${(town.mayor?.name || 'steve').toLowerCase()}.png`"
                    alt="Mayor Avatar"
                    class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 z-10"
                    @load="$event.target.classList.remove('opacity-0')"
                    @error="handleAvatarError('top-town-' + town.id)"
                  />
                </div>
                <div class="min-w-0 flex-1 pr-12">
                  <h4
                    class="text-xs font-bold text-slate-100 truncate group-hover:text-blue-400 transition-colors"
                  >
                    {{ cleanName(town.name) }}
                  </h4>
                  <p class="text-[9px] text-slate-500 truncate mt-0.5">
                    Mayor: {{ town.mayor?.name }}
                  </p>
                </div>
              </div>

              <div
                class="mt-3 flex items-center justify-between border-t border-slate-900/60 pt-2 text-[10px] font-mono text-slate-400"
              >
                <span>👥 {{ town.residents || 0 }} residents</span>
                <span>📦 {{ town.claims?.claimedChunks || 0 }} chunks</span>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <div v-else-if="activeTab === 'nations'" key="nations">
          <h3
            class="text-xs font-bold tracking-wider text-slate-500 uppercase mb-3 flex items-center gap-2"
          >
            <font-awesome-icon icon="flag" class="text-indigo-500" />
            Top 4 Nations by Population
          </h3>
          <TransitionGroup
            tag="div"
            name="card-pop"
            appear
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div
              v-for="(nation, idx) in topNations"
              :key="'top-nation-' + nation.id"
              :style="{ '--card-idx': idx }"
              class="group cursor-pointer relative overflow-hidden rounded-xl border border-indigo-500/10 bg-[#0d0c15]/50 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-indigo-500/30 hover:bg-[#121120]/70 shadow-sm"
              @click="openNationDetails(nation)"
            >
              <!-- Badge indicators for rank -->
              <div
                class="absolute right-3 top-3 text-[10px] font-extrabold text-indigo-500 bg-indigo-500/10 border border-indigo-500/25 rounded-md px-1.5 py-0.5"
              >
                Rank #{{ idx + 1 }}
              </div>

              <div class="flex items-center gap-3">
                <div
                  :class="getPlayerColor(nation.king?.name)"
                  class="relative h-8 w-8 rounded-lg border border-slate-800 flex items-center justify-center font-bold text-[10px] bg-gradient-to-br overflow-hidden shadow-sm shrink-0"
                >
                  <span class="z-0 select-none text-[8px]">{{
                    getPlayerInitials(nation.king?.name)
                  }}</span>
                  <img
                    v-if="!failedAvatars['top-nation-' + nation.id]"
                    :src="`${props.apiBase}/heads/${(nation.king?.name || 'steve').toLowerCase()}.png`"
                    alt="King Avatar"
                    class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 z-10"
                    @load="$event.target.classList.remove('opacity-0')"
                    @error="handleAvatarError('top-nation-' + nation.id)"
                  />
                </div>
                <div class="min-w-0 flex-1 pr-12">
                  <h4
                    class="text-xs font-bold text-slate-100 truncate group-hover:text-indigo-400 transition-colors"
                  >
                    {{ cleanName(nation.name) }}
                  </h4>
                  <p class="text-[9px] text-slate-500 truncate mt-0.5">
                    King: {{ nation.king?.name }}
                  </p>
                </div>
              </div>

              <div
                class="mt-3 flex items-center justify-between border-t border-slate-900/60 pt-2 text-[10px] font-mono text-slate-400"
              >
                <span>👥 {{ nation.residents || 0 }} residents</span>
                <span>🏘️ {{ nation.towns || 0 }} towns</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </Transition>
    </div>

    <!-- Main Navigation controls & filters -->
    <div
      class="flex flex-col justify-between gap-4 border-b border-slate-900 bg-[#090b11]/40 py-4 sm:flex-row sm:items-center"
    >
      <!-- Tabs segmented control -->
      <div
        class="flex items-center gap-1 rounded-xl border border-slate-900 bg-slate-950/80 p-1 self-start"
      >
        <button
          :class="
            activeTab === 'towns'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200"
          @click="
            activeTab = 'towns';
            sortBy = 'residents_desc';
          "
        >
          <font-awesome-icon icon="globe" />
          Towns ({{ townyData?.towns?.length || 0 }})
        </button>
        <button
          :class="
            activeTab === 'nations'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200"
          @click="
            activeTab = 'nations';
            sortBy = 'residents_desc';
          "
        >
          <font-awesome-icon icon="flag" />
          Nations ({{ townyData?.nations?.length || 0 }})
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search bar -->
        <div class="relative w-full sm:w-64">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <font-awesome-icon icon="search" class="text-slate-500 text-xs" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search name, mayor/king..."
            class="block w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            v-if="searchQuery"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
            @click="searchQuery = ''"
          >
            <font-awesome-icon icon="times" class="text-xs" />
          </button>
        </div>

        <!-- Sort Select -->
        <select
          v-model="sortBy"
          class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="name_asc">Name (A - Z)</option>
          <option value="name_desc">Name (Z - A)</option>
          <option value="residents_desc">Residents (High to Low)</option>
          <option value="residents_asc">Residents (Low to High)</option>
          <option v-if="activeTab === 'towns'" value="claims_desc">Claims (High to Low)</option>
          <option v-if="activeTab === 'towns'" value="claims_asc">Claims (Low to High)</option>
          <option v-if="activeTab === 'towns'" value="newest">Age (Newest)</option>
          <option v-if="activeTab === 'towns'" value="oldest">Age (Oldest)</option>
          <option v-if="activeTab === 'nations'" value="towns_desc">
            Towns Count (High to Low)
          </option>
          <option v-if="activeTab === 'nations'" value="allies_desc">
            Allies Count (High to Low)
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center space-y-4 py-24">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"
      />
      <div class="text-center text-xs text-slate-400">Loading Towny Database...</div>
    </div>

    <!-- Error Alert -->
    <div
      v-else-if="fetchError"
      class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400"
    >
      {{ fetchError }}
    </div>

    <!-- Main Lists -->
    <div v-else>
      <Transition name="card-switch" mode="out-in" appear>
        <!-- TOWNS TAB LIST -->
        <div v-if="activeTab === 'towns'" key="towns">
          <div v-if="processedTowns.length === 0" class="py-12 text-center text-xs text-slate-500">
            No towns match your search filters.
          </div>
          <TransitionGroup
            tag="div"
            name="card-pop"
            appear
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div
              v-for="(town, idx) in processedTowns"
              :key="town.id"
              :style="{ '--card-idx': idx }"
              class="group cursor-pointer rounded-xl border border-slate-900 bg-slate-950/40 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-slate-800 hover:bg-[#111420]/60 hover:shadow-lg"
              @click="openTownDetails(town)"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h3
                    class="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors"
                  >
                    {{ cleanName(town.name) }}
                  </h3>
                  <span class="mt-0.5 inline-block text-[10px] text-slate-500"
                    >Mayor: {{ town.mayor?.name }}</span
                  >
                </div>
                <div
                  v-if="town.nation"
                  class="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-400"
                >
                  {{ cleanName(town.nation.name) }}
                </div>
                <div
                  v-else
                  class="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400"
                >
                  Neutral
                </div>
              </div>

              <div
                class="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/60 pt-3 text-center"
              >
                <div>
                  <div class="text-[9px] font-semibold text-slate-500 uppercase">Residents</div>
                  <div class="mt-0.5 font-mono text-xs font-bold text-slate-300">
                    {{ town.residents || 0 }}
                    <span
                      v-if="town.onlineResidents > 0"
                      class="text-[9px] text-emerald-400 font-normal"
                      >({{ town.onlineResidents }} online)</span
                    >
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-semibold text-slate-500 uppercase">Claims</div>
                  <div class="mt-0.5 font-mono text-xs font-bold text-slate-300">
                    {{ town.claims?.claimedChunks || 0 }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-semibold text-slate-500 uppercase">PVP Flag</div>
                  <div class="mt-0.5">
                    <span
                      :class="
                        town.flags?.pvp
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      "
                      class="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                    >
                      {{ town.flags?.pvp ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- NATIONS TAB LIST -->
        <div v-else-if="activeTab === 'nations'" key="nations">
          <div
            v-if="processedNations.length === 0"
            class="py-12 text-center text-xs text-slate-500"
          >
            No nations match your search filters.
          </div>
          <TransitionGroup
            tag="div"
            name="card-pop"
            appear
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div
              v-for="(nation, idx) in processedNations"
              :key="nation.id"
              :style="{ '--card-idx': idx }"
              class="group cursor-pointer rounded-xl border border-slate-900 bg-slate-950/40 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-slate-800 hover:bg-[#151325]/50 hover:shadow-lg"
              @click="openNationDetails(nation)"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h3
                    class="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors"
                  >
                    {{ cleanName(nation.name) }}
                  </h3>
                  <span class="mt-0.5 inline-block text-[10px] text-slate-500"
                    >King: {{ nation.king?.name }}</span
                  >
                </div>
                <div
                  v-if="nation.flags?.neutral"
                  class="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400"
                >
                  Neutral State
                </div>
              </div>

              <div
                class="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/60 pt-3 text-center"
              >
                <div>
                  <div class="text-[9px] font-semibold text-slate-500 uppercase">Towns</div>
                  <div class="mt-0.5 font-mono text-xs font-bold text-slate-300">
                    {{ nation.towns || 0 }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-semibold text-slate-500 uppercase">Residents</div>
                  <div class="mt-0.5 font-mono text-xs font-bold text-slate-300">
                    {{ nation.residents || 0 }}
                    <span
                      v-if="nation.onlineResidents > 0"
                      class="text-[9px] text-emerald-400 font-normal"
                      >({{ nation.onlineResidents }} online)</span
                    >
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-semibold text-slate-500 uppercase">Allies</div>
                  <div class="mt-0.5 font-mono text-xs font-bold text-slate-300">
                    {{ nation.diplomacy?.alliesCount || 0 }}
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </Transition>
    </div>

    <!-- TOWN DETAILS MODAL OVERLAY -->
    <Transition name="modal-fade-box">
      <div
        v-if="selectedTown"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        style="perspective: 1000px"
        @click.self="closeModals"
      >
        <div
          class="modal-box-anim w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0d0f17] shadow-2xl"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-900 px-6 py-4">
            <div class="flex items-center gap-2">
              <font-awesome-icon icon="globe" class="text-blue-400" />
              <h2 class="text-base font-bold text-slate-100">
                {{ cleanName(selectedTown.name) }} Details
              </h2>
            </div>
            <button
              class="text-slate-400 hover:text-slate-200 transition-colors"
              @click="closeModals"
            >
              <font-awesome-icon icon="times" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-5">
            <!-- Mayor details & avatar -->
            <div
              class="flex items-center gap-4 rounded-xl border border-slate-900 bg-slate-950/60 p-4"
            >
              <div
                :class="getPlayerColor(selectedTown.mayor?.name)"
                class="relative h-12 w-12 rounded-lg border border-slate-800 flex items-center justify-center font-extrabold text-xs bg-gradient-to-br overflow-hidden shadow-md shrink-0"
              >
                <span class="z-0 select-none text-[10px]">{{
                  getPlayerInitials(selectedTown.mayor?.name)
                }}</span>
                <img
                  v-if="!failedAvatars['modal-town-' + selectedTown.id]"
                  :src="`${props.apiBase}/heads/${(selectedTown.mayor?.name || 'steve').toLowerCase()}.png`"
                  alt="Mayor Skin"
                  class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 z-10"
                  @load="$event.target.classList.remove('opacity-0')"
                  @error="handleAvatarError('modal-town-' + selectedTown.id)"
                />
              </div>
              <div>
                <div class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Town Mayor
                </div>
                <div class="text-sm font-bold text-slate-100">
                  {{ selectedTown.mayor?.name || 'Unknown' }}
                </div>
                <div class="font-mono text-[9px] text-slate-600 truncate max-w-[280px]">
                  {{ selectedTown.mayor?.uuid }}
                </div>
              </div>
            </div>

            <!-- Claims, residents, coordinates -->
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
                <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Resident Telemetry
                </h4>
                <div class="mt-2 font-mono text-sm text-slate-300">
                  • Total: <strong class="text-slate-100">{{ selectedTown.residents }}</strong
                  ><br />
                  • Online:
                  <strong class="text-emerald-400">{{ selectedTown.onlineResidents }}</strong>
                </div>
              </div>

              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
                <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Land & Claims
                </h4>
                <div class="mt-2 font-mono text-xs text-slate-300 space-y-0.5">
                  <div>
                    • Claimed Chunks:
                    <strong class="text-slate-100">{{ selectedTown.claims?.claimedChunks }}</strong>
                  </div>
                  <div>
                    • Bonus Chunks:
                    <strong class="text-slate-100">{{ selectedTown.claims?.bonusChunks }}</strong>
                  </div>
                  <div>
                    • Outposts:
                    <strong class="text-slate-100">{{ selectedTown.claims?.outpostChunks }}</strong>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
                <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Spawn Coordinates
                </h4>
                <div class="mt-2 font-mono text-[11px] text-slate-300 space-y-0.5">
                  <div>
                    • World: <strong class="text-slate-100">{{ selectedTown.spawn?.world }}</strong>
                  </div>
                  <div>
                    • X:
                    <strong class="text-slate-100">{{ selectedTown.spawn?.x?.toFixed(1) }}</strong>
                  </div>
                  <div>
                    • Y:
                    <strong class="text-slate-100">{{ selectedTown.spawn?.y?.toFixed(1) }}</strong>
                  </div>
                  <div>
                    • Z:
                    <strong class="text-slate-100">{{ selectedTown.spawn?.z?.toFixed(1) }}</strong>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
                <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Homeblock Chunk
                </h4>
                <div class="mt-2 font-mono text-xs text-slate-300">
                  • World:
                  <strong class="text-slate-100">{{ selectedTown.homeblock?.world }}</strong
                  ><br />
                  • Block X: <strong class="text-slate-100">{{ selectedTown.homeblock?.x }}</strong
                  ><br />
                  • Block Z: <strong class="text-slate-100">{{ selectedTown.homeblock?.z }}</strong>
                </div>
              </div>
            </div>

            <!-- Flags -->
            <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
              <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-3">
                Town Configuration Flags
              </h4>
              <div class="grid grid-cols-3 gap-2">
                <div
                  v-for="(val, flag) in selectedTown.flags"
                  :key="flag"
                  :class="
                    val
                      ? 'border-emerald-500/10 bg-emerald-500/5 text-emerald-400'
                      : 'border-slate-800 bg-slate-900/10 text-slate-400'
                  "
                  class="flex flex-col items-center justify-center rounded-lg border p-2 text-center"
                >
                  <span class="text-[10px] font-bold capitalize">{{ flag }}</span>
                  <span class="mt-1 font-mono text-[9px] uppercase font-bold">{{
                    val ? 'ON' : 'OFF'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Age telemetry -->
            <div
              class="flex items-center justify-between border-t border-slate-900 pt-4 font-mono text-[10px] text-slate-500"
            >
              <div>Established: {{ formatDate(selectedTown.createdAt) }}</div>
              <div>Active: {{ formatDate(selectedTown.lastOnlineAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- NATION DETAILS MODAL OVERLAY -->
    <Transition name="modal-fade-box">
      <div
        v-if="selectedNation"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        style="perspective: 1000px"
        @click.self="closeModals"
      >
        <div
          class="modal-box-anim w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0d0f17] shadow-2xl"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-900 px-6 py-4">
            <div class="flex items-center gap-2">
              <font-awesome-icon icon="flag" class="text-indigo-400" />
              <h2 class="text-base font-bold text-slate-100">
                {{ cleanName(selectedNation.name) }} Details
              </h2>
            </div>
            <button
              class="text-slate-400 hover:text-slate-200 transition-colors"
              @click="closeModals"
            >
              <font-awesome-icon icon="times" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-5">
            <!-- King details & avatar -->
            <div
              class="flex items-center gap-4 rounded-xl border border-slate-900 bg-slate-950/60 p-4"
            >
              <div
                :class="getPlayerColor(selectedNation.king?.name)"
                class="relative h-12 w-12 rounded-lg border border-slate-800 flex items-center justify-center font-extrabold text-xs bg-gradient-to-br overflow-hidden shadow-md shrink-0"
              >
                <span class="z-0 select-none text-[10px]">{{
                  getPlayerInitials(selectedNation.king?.name)
                }}</span>
                <img
                  v-if="!failedAvatars['modal-nation-' + selectedNation.id]"
                  :src="`${props.apiBase}/heads/${(selectedNation.king?.name || 'steve').toLowerCase()}.png`"
                  alt="King Skin"
                  class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 z-10"
                  @load="$event.target.classList.remove('opacity-0')"
                  @error="handleAvatarError('modal-nation-' + selectedNation.id)"
                />
              </div>
              <div>
                <div class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Nation King
                </div>
                <div class="text-sm font-bold text-slate-100">
                  {{ selectedNation.king?.name || 'Unknown' }}
                </div>
                <div class="font-mono text-[9px] text-slate-600 truncate max-w-[280px]">
                  {{ selectedNation.king?.uuid }}
                </div>
              </div>
            </div>

            <!-- Basic details -->
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
                <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Nation Capital
                </h4>
                <div class="mt-2 font-mono text-sm text-slate-300">
                  • Capital:
                  <strong class="text-indigo-400">{{
                    cleanName(selectedNation.capital?.name)
                  }}</strong>
                </div>
              </div>

              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
                <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Federation Counts
                </h4>
                <div class="mt-2 font-mono text-xs text-slate-300 space-y-0.5">
                  <div>
                    • Towns Count:
                    <strong class="text-slate-100">{{ selectedNation.towns }}</strong>
                  </div>
                  <div>
                    • Total Residents:
                    <strong class="text-slate-100">{{ selectedNation.residents }}</strong>
                  </div>
                  <div>
                    • Online Residents:
                    <strong class="text-emerald-400">{{ selectedNation.onlineResidents }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Diplomacy (Allies / Enemies) -->
            <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4 space-y-3">
              <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Diplomatic Relations
              </h4>

              <!-- Allies -->
              <div>
                <div class="text-[9px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                  Allies ({{ selectedNation.diplomacy?.allies?.length || 0 }})
                </div>
                <div
                  v-if="!selectedNation.diplomacy?.allies?.length"
                  class="text-xs text-slate-500 italic"
                >
                  No allies recorded.
                </div>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span
                    v-for="ally in selectedNation.diplomacy.allies"
                    :key="ally.id"
                    class="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 font-medium"
                  >
                    {{ cleanName(ally.name) }}
                  </span>
                </div>
              </div>

              <!-- Enemies -->
              <div class="pt-2 border-t border-slate-900/60">
                <div class="text-[9px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                  Enemies ({{ selectedNation.diplomacy?.enemies?.length || 0 }})
                </div>
                <div
                  v-if="!selectedNation.diplomacy?.enemies?.length"
                  class="text-xs text-slate-500 italic"
                >
                  No active enemies.
                </div>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span
                    v-for="enemy in selectedNation.diplomacy.enemies"
                    :key="enemy.id"
                    class="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 font-medium"
                  >
                    {{ cleanName(enemy.name) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Configuration Flags -->
            <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-4">
              <h4 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-3">
                Nation Flags
              </h4>
              <div class="grid grid-cols-3 gap-2">
                <div
                  v-for="(val, flag) in selectedNation.flags"
                  :key="flag"
                  :class="
                    val
                      ? 'border-emerald-500/10 bg-emerald-500/5 text-emerald-400'
                      : 'border-slate-800 bg-slate-900/10 text-slate-400'
                  "
                  class="flex flex-col items-center justify-center rounded-lg border p-2 text-center"
                >
                  <span class="text-[10px] font-bold capitalize">{{ flag }}</span>
                  <span class="mt-1 font-mono text-[9px] uppercase font-bold">{{
                    val ? 'ON' : 'OFF'
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
