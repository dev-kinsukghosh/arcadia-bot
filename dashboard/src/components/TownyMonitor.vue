<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import axios from 'axios';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useTownyStore } from '../stores/townyStore.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps({
  apiBase: {
    type: String,
    required: true,
  },
});

const route = useRoute();
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

const townsTabRef = ref(null);
const nationsTabRef = ref(null);

const townyTabPillStyle = computed(() => {
  if (activeTab.value === 'towns') {
    return {
      left: '4px',
      width: townsTabRef.value ? `${townsTabRef.value.offsetWidth}px` : '120px',
    };
  } else {
    const leftOffset = townsTabRef.value ? townsTabRef.value.offsetWidth + 8 : 130;
    return {
      left: `${leftOffset}px`,
      width: nationsTabRef.value ? `${nationsTabRef.value.offsetWidth}px` : '120px',
    };
  }
});

function checkAndAutoSelectFromQuery() {
  if (!route.query.search || !townyData.value) return;
  const q = String(route.query.search).toLowerCase().trim();
  const qClean = q.replace(/_/g, ' ');

  if (activeTab.value === 'towns' && Array.isArray(townyData.value.towns)) {
    const match = townyData.value.towns.find(
      (t) =>
        (t.name || '').toLowerCase() === q ||
        (t.name || '').replace(/_/g, ' ').toLowerCase() === qClean
    );
    if (match) {
      selectedTown.value = match;
    }
  } else if (activeTab.value === 'nations' && Array.isArray(townyData.value.nations)) {
    const match = townyData.value.nations.find(
      (n) =>
        (n.name || '').toLowerCase() === q ||
        (n.name || '').replace(/_/g, ' ').toLowerCase() === qClean
    );
    if (match) {
      selectedNation.value = match;
    }
  }
}

function applyRouteQuery() {
  if (route.query.tab) {
    activeTab.value = route.query.tab;
  }
  if (route.query.search !== undefined) {
    searchQuery.value = route.query.search;
  }
  checkAndAutoSelectFromQuery();
}

onMounted(() => {
  applyRouteQuery();
  if (!townyData.value) {
    townyStore.fetchTownyData();
  } else {
    checkAndAutoSelectFromQuery();
  }
});

watch(
  () => route.query,
  () => {
    applyRouteQuery();
  }
);

watch(townyData, (newData) => {
  if (newData) {
    checkAndAutoSelectFromQuery();
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
  const queryClean = query.replace(/_/g, ' ');
  if (query) {
    result = result.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.name || '').replace(/_/g, ' ').toLowerCase().includes(queryClean) ||
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
  const queryClean = query.replace(/_/g, ' ');
  if (query) {
    result = result.filter(
      (n) =>
        (n.name || '').toLowerCase().includes(query) ||
        (n.name || '').replace(/_/g, ' ').toLowerCase().includes(queryClean) ||
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

const townHistory = ref([]);
const nationHistory = ref([]);
const isChartLoading = ref(false);

const formatLabelDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    return `${parts[1]}/${parts[2]}`; // MM/DD
  }
  return dateStr;
};

const townChartData = computed(() => {
  if (!townHistory.value || townHistory.value.length === 0) return null;
  return {
    labels: townHistory.value.map((row) => formatLabelDate(row.date)),
    datasets: [
      {
        label: 'Residents',
        data: townHistory.value.map((row) => row.residents || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        tension: 0.35,
        fill: true,
        borderWidth: 2,
        pointRadius: 2,
      },
    ],
  };
});

const nationChartData = computed(() => {
  if (!nationHistory.value || nationHistory.value.length === 0) return null;
  return {
    labels: nationHistory.value.map((row) => formatLabelDate(row.date)),
    datasets: [
      {
        label: 'Residents',
        data: nationHistory.value.map((row) => row.residents || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        tension: 0.35,
        fill: true,
        borderWidth: 2,
        pointRadius: 2,
      },
      {
        label: 'Towns',
        data: nationHistory.value.map((row) => row.townsCount || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.35,
        fill: true,
        borderWidth: 2,
        pointRadius: 2,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#94a3b8',
        font: {
          family: 'Outfit',
          size: 11,
        },
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 8,
      font: {
        family: 'Inter',
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: '#1e293b',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          family: 'Fira Code',
          size: 9,
        },
        maxTicksLimit: 7,
      },
    },
    y: {
      grid: {
        color: '#1e293b',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          family: 'Fira Code',
          size: 9,
        },
      },
    },
  },
};

watch(selectedTown, async (newTown) => {
  if (newTown) {
    isChartLoading.value = true;
    townHistory.value = [];
    try {
      const res = await axios.get(`${props.apiBase}/towny/history`, {
        params: {
          name: newTown.name.toLowerCase(),
          type: 'town',
          days: 30,
        },
      });
      townHistory.value = res.data || [];
    } catch (err) {
      console.error('Failed to fetch town history:', err);
    } finally {
      isChartLoading.value = false;
    }
  } else {
    townHistory.value = [];
  }
});

watch(selectedNation, async (newNation) => {
  if (newNation) {
    isChartLoading.value = true;
    nationHistory.value = [];
    try {
      const res = await axios.get(`${props.apiBase}/towny/history`, {
        params: {
          name: newNation.name.toLowerCase(),
          type: 'nation',
          days: 30,
        },
      });
      nationHistory.value = res.data || [];
    } catch (err) {
      console.error('Failed to fetch nation history:', err);
    } finally {
      isChartLoading.value = false;
    }
  } else {
    nationHistory.value = [];
  }
});

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
        class="relative col-span-2 overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-4 shadow-sm md:col-span-1"
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
            class="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase"
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
              class="group hover:scale-1.02 relative cursor-pointer overflow-hidden rounded-xl border border-blue-500/10 bg-[#0c0d15]/50 p-4 shadow-sm transition-all duration-200 hover:border-blue-500/30 hover:bg-[#11131f]/70"
              @click="openTownDetails(town)"
            >
              <!-- Badge indicators for rank -->
              <div
                class="absolute top-3 right-3 rounded-md border border-blue-500/25 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-500"
              >
                Rank #{{ idx + 1 }}
              </div>

              <div class="flex items-center gap-3">
                <div
                  :class="getPlayerColor(town.mayor?.name)"
                  class="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br text-[10px] font-bold shadow-sm"
                >
                  <span class="z-0 text-[8px] select-none">{{
                    getPlayerInitials(town.mayor?.name)
                  }}</span>
                  <img
                    v-if="!failedAvatars['top-town-' + town.id]"
                    :src="`${props.apiBase}/heads/${(town.mayor?.name || 'steve').toLowerCase()}.png`"
                    alt="Mayor Avatar"
                    class="absolute inset-0 z-10 size-full object-cover opacity-0 transition-opacity duration-300"
                    @load="$event.target.classList.remove('opacity-0')"
                    @error="handleAvatarError('top-town-' + town.id)"
                  />
                </div>
                <div class="min-w-0 flex-1 pr-12">
                  <h4
                    class="truncate text-xs font-bold text-slate-100 transition-colors group-hover:text-blue-400"
                  >
                    {{ cleanName(town.name) }}
                  </h4>
                  <p class="mt-0.5 truncate text-[9px] text-slate-500">
                    Mayor: {{ town.mayor?.name }}
                    <span
                      v-if="town.mayor?.displayName && town.mayor?.displayName !== town.mayor?.name"
                      class="text-slate-400"
                    >
                      ({{ town.mayor?.displayName }})
                    </span>
                  </p>
                </div>
              </div>

              <div
                class="mt-3 flex items-center justify-between border-t border-slate-900/60 pt-2 font-mono text-[10px] text-slate-400"
              >
                <span>👥 {{ town.residents || 0 }} residents</span>
                <span>📦 {{ town.claims?.claimedChunks || 0 }} chunks</span>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <div v-else-if="activeTab === 'nations'" key="nations">
          <h3
            class="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase"
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
              class="group hover:scale-1.02 relative cursor-pointer overflow-hidden rounded-xl border border-indigo-500/10 bg-[#0d0c15]/50 p-4 shadow-sm transition-all duration-200 hover:border-indigo-500/30 hover:bg-[#121120]/70"
              @click="openNationDetails(nation)"
            >
              <!-- Badge indicators for rank -->
              <div
                class="absolute top-3 right-3 rounded-md border border-indigo-500/25 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-indigo-500"
              >
                Rank #{{ idx + 1 }}
              </div>

              <div class="flex items-center gap-3">
                <div
                  :class="getPlayerColor(nation.king?.name)"
                  class="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br text-[10px] font-bold shadow-sm"
                >
                  <span class="z-0 text-[8px] select-none">{{
                    getPlayerInitials(nation.king?.name)
                  }}</span>
                  <img
                    v-if="!failedAvatars['top-nation-' + nation.id]"
                    :src="`${props.apiBase}/heads/${(nation.king?.name || 'steve').toLowerCase()}.png`"
                    alt="King Avatar"
                    class="absolute inset-0 z-10 size-full object-cover opacity-0 transition-opacity duration-300"
                    @load="$event.target.classList.remove('opacity-0')"
                    @error="handleAvatarError('top-nation-' + nation.id)"
                  />
                </div>
                <div class="min-w-0 flex-1 pr-12">
                  <h4
                    class="truncate text-xs font-bold text-slate-100 transition-colors group-hover:text-indigo-400"
                  >
                    {{ cleanName(nation.name) }}
                  </h4>
                  <p class="mt-0.5 truncate text-[9px] text-slate-500">
                    King: {{ nation.king?.name }}
                  </p>
                </div>
              </div>

              <div
                class="mt-3 flex items-center justify-between border-t border-slate-900/60 pt-2 font-mono text-[10px] text-slate-400"
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
      <!-- Tabs segmented control with Animated Sliding Pill -->
      <div
        class="relative flex items-center gap-1 self-start rounded-xl border border-slate-900 bg-slate-950/80 p-1"
      >
        <!-- Dynamic Animated Sliding Highlight Pill -->
        <div
          class="absolute top-1 bottom-1 rounded-lg bg-slate-800/90 shadow-sm transition-all duration-300 ease-out"
          :style="townyTabPillStyle"
        ></div>

        <button
          ref="townsTabRef"
          :class="
            activeTab === 'towns' ? 'font-bold text-white' : 'text-slate-400 hover:text-slate-200'
          "
          class="relative z-10 flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors duration-200"
          @click="
            activeTab = 'towns';
            sortBy = 'residents_desc';
          "
        >
          <font-awesome-icon icon="globe" class="text-blue-400" />
          Towns ({{ townyData?.towns?.length || 0 }})
        </button>

        <button
          ref="nationsTabRef"
          :class="
            activeTab === 'nations' ? 'font-bold text-white' : 'text-slate-400 hover:text-slate-200'
          "
          class="relative z-10 flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors duration-200"
          @click="
            activeTab = 'nations';
            sortBy = 'residents_desc';
          "
        >
          <font-awesome-icon icon="flag" class="text-indigo-400" />
          Nations ({{ townyData?.nations?.length || 0 }})
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search bar -->
        <div class="relative w-full sm:w-64">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <font-awesome-icon icon="search" class="text-xs text-slate-500" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search name, mayor/king..."
            class="block w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pr-4 pl-9 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
      <div class="size-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
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
          <!-- Empty state / Fallen town warning banner -->
          <div
            v-if="processedTowns.length === 0"
            class="my-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center shadow-lg"
          >
            <div class="flex flex-col items-center justify-center gap-2.5">
              <div
                class="flex size-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/20 text-amber-400"
              >
                <font-awesome-icon icon="triangle-exclamation" class="text-base" />
              </div>
              <h4 class="text-sm font-bold text-amber-200 sm:text-base">
                <span v-if="searchQuery">
                  Town "<span class="font-mono text-amber-300">{{ searchQuery }}</span
                  >" is no longer active
                </span>
                <span v-else>No towns found</span>
              </h4>
              <p class="max-w-md text-xs text-amber-300/80">
                <span v-if="searchQuery">
                  This town is not present in active server records. It has fallen, been ruined, or
                  deleted.
                </span>
                <span v-else>No active towns match your current search filters.</span>
              </p>
              <button
                v-if="searchQuery"
                class="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/30 hover:text-white"
                @click="searchQuery = ''"
              >
                Clear Search Filter
              </button>
            </div>
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
              class="group hover:scale-1.02 cursor-pointer rounded-xl border border-slate-900 bg-slate-950/40 p-4 transition-all duration-200 hover:border-slate-800 hover:bg-[#111420]/60 hover:shadow-lg"
              @click="openTownDetails(town)"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h3
                    class="text-sm font-bold text-slate-100 transition-colors group-hover:text-blue-400"
                  >
                    {{ cleanName(town.name) }}
                  </h3>
                  <span class="mt-0.5 inline-block text-[10px] text-slate-500">
                    Mayor: {{ town.mayor?.name }}
                    <span
                      v-if="town.mayor?.displayName && town.mayor?.displayName !== town.mayor?.name"
                      class="text-slate-400"
                    >
                      ({{ town.mayor?.displayName }})
                    </span>
                  </span>
                </div>
                <div
                  v-if="town.nation"
                  class="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400"
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
                      class="text-[9px] font-normal text-emerald-400"
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
                          ? 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
                          : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
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
          <!-- Empty state / Fallen nation warning banner -->
          <div
            v-if="processedNations.length === 0"
            class="my-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center shadow-lg"
          >
            <div class="flex flex-col items-center justify-center gap-2.5">
              <div
                class="flex size-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/20 text-amber-400"
              >
                <font-awesome-icon icon="triangle-exclamation" class="text-base" />
              </div>
              <h4 class="text-sm font-bold text-amber-200 sm:text-base">
                <span v-if="searchQuery">
                  Nation "<span class="font-mono text-amber-300">{{ searchQuery }}</span
                  >" is no longer active
                </span>
                <span v-else>No nations found</span>
              </h4>
              <p class="max-w-md text-xs text-amber-300/80">
                <span v-if="searchQuery">
                  This nation is not present in active server records. It has fallen or disbanded.
                </span>
                <span v-else>No active nations match your current search filters.</span>
              </p>
              <button
                v-if="searchQuery"
                class="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/30 hover:text-white"
                @click="searchQuery = ''"
              >
                Clear Search Filter
              </button>
            </div>
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
              class="group hover:scale-1.02 cursor-pointer rounded-xl border border-slate-900 bg-slate-950/40 p-4 transition-all duration-200 hover:border-slate-800 hover:bg-[#151325]/50 hover:shadow-lg"
              @click="openNationDetails(nation)"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h3
                    class="text-sm font-bold text-slate-100 transition-colors group-hover:text-indigo-400"
                  >
                    {{ cleanName(nation.name) }}
                  </h3>
                  <span class="mt-0.5 inline-block text-[10px] text-slate-500"
                    >King: {{ nation.king?.name }}</span
                  >
                </div>
                <div
                  v-if="nation.flags?.neutral"
                  class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400"
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
                      class="text-[9px] font-normal text-emerald-400"
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
        class="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        style="perspective: 1000px"
        @click.self="closeModals"
      >
        <div
          class="modal-box-anim w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0d0f17]/90 shadow-2xl backdrop-blur-md"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-900/80 px-5 py-3.5">
            <div class="flex items-center gap-2">
              <font-awesome-icon icon="globe" class="text-blue-400" />
              <h2 class="text-sm font-bold text-slate-100">
                {{ cleanName(selectedTown.name) }} Details
              </h2>
            </div>
            <button
              class="text-slate-400 transition-colors hover:text-slate-200"
              @click="closeModals"
            >
              <font-awesome-icon icon="times" />
            </button>
          </div>

          <!-- Modal Body -->
          <div
            class="flex max-h-[85vh] flex-col overflow-y-auto p-5 md:grid md:grid-cols-12 md:gap-4"
          >
            <!-- Column 1: Mayor & Telemetry (col-span-4) -->
            <div class="space-y-3 md:col-span-4">
              <!-- Mayor details & avatar -->
              <div
                class="flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-950/60 p-2.5"
              >
                <div
                  :class="getPlayerColor(selectedTown.mayor?.name)"
                  class="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br text-xs font-extrabold shadow-md"
                >
                  <span class="z-0 text-[9px] select-none">{{
                    getPlayerInitials(selectedTown.mayor?.name)
                  }}</span>
                  <img
                    v-if="!failedAvatars['modal-town-' + selectedTown.id]"
                    :src="`${props.apiBase}/heads/${(selectedTown.mayor?.name || 'steve').toLowerCase()}.png`"
                    alt="Mayor Skin"
                    class="absolute inset-0 z-10 size-full object-cover opacity-0 transition-opacity duration-300"
                    @load="$event.target.classList.remove('opacity-0')"
                    @error="handleAvatarError('modal-town-' + selectedTown.id)"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[8px] font-bold tracking-wider text-slate-500 uppercase">
                    Town Mayor
                  </div>
                  <div class="truncate text-xs font-bold text-slate-100">
                    {{ selectedTown.mayor?.name || 'Unknown' }}
                  </div>
                  <div
                    v-if="
                      selectedTown.mayor?.displayName &&
                      selectedTown.mayor?.displayName !== selectedTown.mayor?.name
                    "
                    class="truncate font-mono text-[9px] text-slate-400"
                  >
                    Nick: {{ selectedTown.mayor?.displayName }}
                  </div>
                </div>
              </div>

              <!-- Telemetry -->
              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-3">
                <h4 class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Resident Telemetry
                </h4>
                <div class="mt-1.5 font-mono text-xs text-slate-300">
                  • Total: <strong class="text-slate-100">{{ selectedTown.residents }}</strong
                  ><br />
                  • Online:
                  <strong class="text-emerald-400">{{ selectedTown.onlineResidents }}</strong>
                </div>
              </div>
            </div>

            <!-- Column 2: Land & Coordinates (col-span-4) -->
            <div class="space-y-3 md:col-span-4">
              <!-- Claims -->
              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-3">
                <h4 class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Land & Claims
                </h4>
                <div class="mt-1 space-y-0.5 font-mono text-xs text-slate-300">
                  <div>
                    • Claimed:
                    <strong class="text-slate-100">{{ selectedTown.claims?.claimedChunks }}</strong>
                  </div>
                  <div>
                    • Bonus:
                    <strong class="text-slate-100">{{ selectedTown.claims?.bonusChunks }}</strong>
                  </div>
                  <div>
                    • Outposts:
                    <strong class="text-slate-100">{{
                      selectedTown.claims?.outpostChunks || 0
                    }}</strong>
                  </div>
                </div>
              </div>

              <!-- Coordinates -->
              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-3">
                <h4 class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Telemetry Positions
                </h4>
                <div class="mt-1 space-y-0.5 font-mono text-[10px] text-slate-300">
                  <div class="truncate">
                    • Spawn:
                    <strong class="text-slate-100"
                      >{{ selectedTown.spawn?.world }} ({{
                        Math.round(selectedTown.spawn?.x ?? 0)
                      }}, {{ Math.round(selectedTown.spawn?.z ?? 0) }})</strong
                    >
                  </div>
                  <div class="truncate">
                    • Homeblock:
                    <strong class="text-slate-100"
                      >{{ selectedTown.homeblock?.world }} ({{ selectedTown.homeblock?.x }},
                      {{ selectedTown.homeblock?.z }})</strong
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 3: Flags (col-span-4) -->
            <div class="md:col-span-4">
              <!-- Flags -->
              <div class="h-full rounded-xl border border-slate-900/60 bg-slate-950/20 p-3">
                <h4 class="mb-3 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Town Flags
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
                    <span class="mt-1 font-mono text-[9px] font-bold uppercase">{{
                      val ? 'ON' : 'OFF'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Side: Graph (col-span-12) -->
            <div class="mt-2 flex flex-col md:col-span-12">
              <div class="rounded-xl border border-slate-900 bg-slate-950/20 p-4">
                <h4 class="mb-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  30-Day Population Trend
                </h4>
                <div class="relative h-45 w-full">
                  <div
                    v-if="isChartLoading"
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      class="size-5 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500"
                    ></div>
                  </div>
                  <div
                    v-else-if="!townChartData"
                    class="flex h-full items-center justify-center text-center text-[10px] text-slate-500 italic"
                  >
                    No historical telemetry available yet.
                  </div>
                  <div v-else class="size-full">
                    <Line :data="townChartData" :options="chartOptions" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Age telemetry (col-span-12) -->
            <div
              class="flex items-center justify-between border-t border-slate-900/60 pt-3 font-mono text-[9px] text-slate-500 md:col-span-12"
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
        class="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        style="perspective: 1000px"
        @click.self="closeModals"
      >
        <div
          class="modal-box-anim w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0d0f17]/90 shadow-2xl backdrop-blur-md"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-900/80 px-5 py-3.5">
            <div class="flex items-center gap-2">
              <font-awesome-icon icon="flag" class="text-indigo-400" />
              <h2 class="text-sm font-bold text-slate-100">
                {{ cleanName(selectedNation.name) }} Details
              </h2>
            </div>
            <button
              class="text-slate-400 transition-colors hover:text-slate-200"
              @click="closeModals"
            >
              <font-awesome-icon icon="times" />
            </button>
          </div>

          <!-- Modal Body -->
          <div
            class="flex max-h-[85vh] flex-col overflow-y-auto p-5 md:grid md:grid-cols-12 md:gap-5"
          >
            <!-- Column 1: King & Federation (col-span-4) -->
            <div class="space-y-3 md:col-span-4">
              <!-- King details & avatar -->
              <div
                class="flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-950/60 p-2.5"
              >
                <div
                  :class="getPlayerColor(selectedNation.king?.name)"
                  class="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br text-xs font-extrabold shadow-md"
                >
                  <span class="z-0 text-[9px] select-none">{{
                    getPlayerInitials(selectedNation.king?.name)
                  }}</span>
                  <img
                    v-if="!failedAvatars['modal-nation-' + selectedNation.id]"
                    :src="`${props.apiBase}/heads/${(selectedNation.king?.name || 'steve').toLowerCase()}.png`"
                    alt="King Skin"
                    class="absolute inset-0 z-10 size-full object-cover opacity-0 transition-opacity duration-300"
                    @load="$event.target.classList.remove('opacity-0')"
                    @error="handleAvatarError('modal-nation-' + selectedNation.id)"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                    Nation King
                  </div>
                  <div class="truncate text-xs font-bold text-slate-100">
                    {{ selectedNation.king?.name || 'Unknown' }}
                  </div>
                  <div
                    v-if="
                      selectedNation.king?.displayName &&
                      selectedNation.king?.displayName !== selectedNation.king?.name
                    "
                    class="truncate font-mono text-[9px] text-slate-400"
                  >
                    Nick: {{ selectedNation.king?.displayName }}
                  </div>
                </div>
              </div>

              <!-- Federation Counts -->
              <div class="rounded-xl border border-slate-900/60 bg-slate-950/20 p-3">
                <h4 class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Federation Counts
                </h4>
                <div class="mt-1 space-y-0.5 font-mono text-xs text-slate-300">
                  <div>
                    • Capital:
                    <strong class="text-indigo-400">{{
                      cleanName(selectedNation.capital?.name)
                    }}</strong>
                  </div>
                  <div>
                    • Towns:
                    <strong class="text-slate-100">{{ selectedNation.towns }}</strong>
                  </div>
                  <div>
                    • Residents:
                    <strong class="text-slate-100">{{ selectedNation.residents }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 2: Diplomacy (col-span-4) -->
            <div class="md:col-span-4">
              <!-- Diplomacy (Allies / Enemies) -->
              <div
                class="flex h-full flex-col justify-stretch space-y-2.5 rounded-xl border border-slate-900/60 bg-[#0d0f17] p-3"
              >
                <h4 class="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Diplomatic Relations
                </h4>
                <div class="flex-1 space-y-2">
                  <!-- Allies -->
                  <div>
                    <div class="mb-1 text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                      Allies ({{ selectedNation.diplomacy?.allies?.length || 0 }})
                    </div>
                    <div
                      v-if="!selectedNation.diplomacy?.allies?.length"
                      class="text-[10px] text-slate-500 italic"
                    >
                      No allies recorded.
                    </div>
                    <div
                      v-else
                      class="custom-scrollbar flex max-h-[50px] flex-wrap gap-1 overflow-y-auto"
                    >
                      <span
                        v-for="ally in selectedNation.diplomacy.allies"
                        :key="ally.id"
                        class="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-300"
                      >
                        {{ cleanName(ally.name) }}
                      </span>
                    </div>
                  </div>

                  <!-- Enemies -->
                  <div class="border-t border-slate-900/60 pt-1.5">
                    <div class="mb-1 text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                      Enemies ({{ selectedNation.diplomacy?.enemies?.length || 0 }})
                    </div>
                    <div
                      v-if="!selectedNation.diplomacy?.enemies?.length"
                      class="text-[10px] text-slate-500 italic"
                    >
                      No active enemies.
                    </div>
                    <div
                      v-else
                      class="custom-scrollbar flex max-h-[50px] flex-wrap gap-1 overflow-y-auto"
                    >
                      <span
                        v-for="enemy in selectedNation.diplomacy.enemies"
                        :key="enemy.id"
                        class="rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-medium text-rose-300"
                      >
                        {{ cleanName(enemy.name) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 3: Flags (col-span-4) -->
            <div class="md:col-span-4">
              <!-- Flags -->
              <div class="h-full rounded-xl border border-slate-900/60 bg-slate-950/20 p-3">
                <h4 class="mb-3 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
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
                    <span class="mt-1 font-mono text-[9px] font-bold uppercase">{{
                      val ? 'ON' : 'OFF'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Side: Graph (col-span-12) -->
            <div class="mt-2 flex flex-col md:col-span-12">
              <div class="rounded-xl border border-slate-900 bg-slate-950/20 p-4">
                <h4 class="mb-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  30-Day Growth Trend
                </h4>
                <div class="relative h-45 w-full">
                  <div
                    v-if="isChartLoading"
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      class="size-5 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500"
                    ></div>
                  </div>
                  <div
                    v-else-if="!nationChartData"
                    class="flex h-full items-center justify-center text-center text-[10px] text-slate-500 italic"
                  >
                    No historical telemetry available yet.
                  </div>
                  <div v-else class="size-full">
                    <Line :data="nationChartData" :options="chartOptions" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
