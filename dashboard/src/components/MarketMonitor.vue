<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const emit = defineEmits(['refresh-stats']);

const props = defineProps({
  currencies: {
    type: Array,
    required: true,
  },
  apiBase: {
    type: String,
    required: true,
  },
});

// Filters (persisted in localStorage)
const savedLimitType = localStorage.getItem('market:limitType');
const limitType = ref(savedLimitType || '10'); // '5', '10', '20', 'all', 'custom'

const savedCustomLimit = localStorage.getItem('market:customLimit');
const customLimit = ref(savedCustomLimit ? parseInt(savedCustomLimit, 10) : 15);

const savedFilterCriteria = localStorage.getItem('market:filterCriteria');
const filterCriteria = ref(savedFilterCriteria || 'all'); // 'all', 'best_perform', 'worst_perform', 'stable', 'volatile', 'stable_high_val'

const savedSearch = localStorage.getItem('market:search');
const searchSearch = ref(savedSearch || '');

const savedNations = localStorage.getItem('market:selectedNations');
const selectedNations = ref(savedNations ? JSON.parse(savedNations) : []);

const savedItems = localStorage.getItem('market:selectedItems');
const selectedItems = ref(savedItems ? JSON.parse(savedItems) : []);

const nationsDropdownOpen = ref(false);
const itemsDropdownOpen = ref(false);
const nationsSearch = ref('');
const itemsSearch = ref('');

const savedPriceDir = localStorage.getItem('market:filterPriceDir');
const filterPriceDir = ref(savedPriceDir || 'all'); // 'all', 'gainers', 'losers', 'flat'

const savedPriceTier = localStorage.getItem('market:filterPriceTier');
const filterPriceTier = ref(savedPriceTier || 'all'); // 'all', 'high', 'medium', 'low'

const savedStabilityTier = localStorage.getItem('market:filterStabilityTier');
const filterStabilityTier = ref(savedStabilityTier || 'all'); // 'all', 'steady', 'mixed', 'risky'

const savedVolatilityThreshold = localStorage.getItem('market:volatilityAlertThreshold');
const volatilityAlertThreshold = ref(savedVolatilityThreshold ? parseInt(savedVolatilityThreshold, 10) : 15);

// Watchlist
const pinnedFavorites = ref([]);

const savedMarketDays = localStorage.getItem('market:days');
const parsedMarketDays = savedMarketDays ? parseInt(savedMarketDays, 10) : 30;
const daysLimit = ref(isNaN(parsedMarketDays) ? 30 : parsedMarketDays);

watch(daysLimit, (newVal) => {
  localStorage.setItem('market:days', String(newVal));
  emit('refresh-stats');
});

// Watch and persist filter settings in localStorage
watch(
  [
    limitType,
    customLimit,
    filterCriteria,
    searchSearch,
    selectedNations,
    selectedItems,
    filterPriceDir,
    filterPriceTier,
    filterStabilityTier,
    volatilityAlertThreshold,
  ],
  ([
    newLimitType,
    newCustomLimit,
    newFilterCriteria,
    newSearch,
    newNations,
    newItems,
    newPriceDir,
    newPriceTier,
    newStabilityTier,
    newVolatilityThreshold,
  ]) => {
    localStorage.setItem('market:limitType', newLimitType);
    localStorage.setItem('market:customLimit', String(newCustomLimit));
    localStorage.setItem('market:filterCriteria', newFilterCriteria);
    localStorage.setItem('market:search', newSearch);
    localStorage.setItem('market:selectedNations', JSON.stringify(newNations));
    localStorage.setItem('market:selectedItems', JSON.stringify(newItems));
    localStorage.setItem('market:filterPriceDir', newPriceDir);
    localStorage.setItem('market:filterPriceTier', newPriceTier);
    localStorage.setItem('market:filterStabilityTier', newStabilityTier);
    localStorage.setItem('market:volatilityAlertThreshold', String(newVolatilityThreshold));
  },
  { deep: true }
);

function loadPinnedFavorites() {
  const saved = localStorage.getItem('currencies:favorites');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      pinnedFavorites.value = Array.isArray(parsed) ? parsed : [];
    } catch {
      pinnedFavorites.value = [];
    }
  } else {
    pinnedFavorites.value = [];
  }
}

function togglePin(id) {
  if (!Array.isArray(pinnedFavorites.value)) {
    pinnedFavorites.value = [];
  }
  const idx = pinnedFavorites.value.indexOf(id);
  if (idx > -1) {
    pinnedFavorites.value.splice(idx, 1);
  } else {
    pinnedFavorites.value.push(id);
  }
  localStorage.setItem('currencies:favorites', JSON.stringify(pinnedFavorites.value));
}

function isPinned(id) {
  return Array.isArray(pinnedFavorites.value) && pinnedFavorites.value.includes(id);
}

function clearFilters() {
  limitType.value = '10';
  customLimit.value = 15;
  filterCriteria.value = 'all';
  searchSearch.value = '';
  selectedNations.value = [];
  selectedItems.value = [];
  nationsDropdownOpen.value = false;
  itemsDropdownOpen.value = false;
  nationsSearch.value = '';
  itemsSearch.value = '';
  filterPriceDir.value = 'all';
  filterPriceTier.value = 'all';
  filterStabilityTier.value = 'all';
  volatilityAlertThreshold.value = 15;
}

function toggleNationFilter(nation) {
  if (selectedNations.value.includes(nation)) {
    selectedNations.value = selectedNations.value.filter((n) => n !== nation);
  } else {
    selectedNations.value.push(nation);
  }
}

function toggleItemFilter(item) {
  if (selectedItems.value.includes(item)) {
    selectedItems.value = selectedItems.value.filter((i) => i !== item);
  } else {
    selectedItems.value.push(item);
  }
}

function getSteadinessTier(curr) {
  const max = parseFloat(curr.maxRate) || 0;
  const live = parseFloat(curr.liveRate) || 0;
  const min = parseFloat(curr.minRate) || 0;

  if (max > 0) {
    const dropFromMax = ((max - live) / max) * 100;
    if (dropFromMax >= 20) {
      const range = max - min;
      const recoveryRatio = range > 0 ? (live - min) / range : 0;
      if (recoveryRatio < 0.3) {
        return 'risky';
      }
    }
  }

  const score = curr.stabilityScore || 0;
  if (score >= 85) return 'steady';
  if (score >= 65) return 'mixed';
  return 'risky';
}

// Computeds
const uniqueNations = computed(() => {
  return [...new Set(props.currencies.map((c) => c.nation).filter(Boolean))].sort();
});

const uniqueItems = computed(() => {
  return [...new Set(props.currencies.map((c) => c.standardItem).filter(Boolean))].sort();
});

const filteredNationsList = computed(() => {
  if (!nationsSearch.value) return uniqueNations.value;
  const q = nationsSearch.value.toLowerCase();
  return uniqueNations.value.filter((n) => n.toLowerCase().replace(/_/g, ' ').includes(q));
});

const filteredItemsList = computed(() => {
  if (!itemsSearch.value) return uniqueItems.value;
  const q = itemsSearch.value.toLowerCase();
  return uniqueItems.value.filter((i) => i.toLowerCase().replace(/_/g, ' ').includes(q));
});

const maxLiveRate = computed(() => {
  if (!props.currencies || props.currencies.length === 0) return 1;
  const rates = props.currencies.map((c) => c.liveRate || 0);
  return Math.max(...rates, 1);
});

const topPerformers = computed(() => {
  if (!props.currencies || props.currencies.length === 0) return [];
  const maxRate = maxLiveRate.value;
  return [...props.currencies]
    .sort((a, b) => {
      const aNorm = (a.liveRate || 0) / maxRate;
      const bNorm = (b.liveRate || 0) / maxRate;
      const aScore = (a.stabilityScore || 0) * 1.0 + aNorm * 50.0;
      const bScore = (b.stabilityScore || 0) * 1.0 + bNorm * 50.0;
      return bScore - aScore;
    })
    .slice(0, 5);
});

const filteredCurrencies = computed(() => {
  let list = [...props.currencies];

  // Search filter
  if (searchSearch.value) {
    const query = searchSearch.value.toLowerCase();
    list = list.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(query) ||
        (c.id || '').toLowerCase().includes(query) ||
        (c.nation || '').toLowerCase().includes(query)
    );
  }

  // Tag filters
  if (selectedNations.value.length > 0) {
    list = list.filter((c) => selectedNations.value.includes(c.nation));
  }

  if (selectedItems.value.length > 0) {
    list = list.filter((c) => selectedItems.value.includes(c.standardItem));
  }

  // Price direction filter
  if (filterPriceDir.value === 'gainers') {
    list = list.filter((c) => (c.percentageChange || 0) > 0);
  } else if (filterPriceDir.value === 'losers') {
    list = list.filter((c) => (c.percentageChange || 0) < 0);
  } else if (filterPriceDir.value === 'flat') {
    list = list.filter((c) => (c.percentageChange || 0) === 0);
  }

  // Value tier filter
  if (filterPriceTier.value === 'high') {
    list = list.filter((c) => (c.liveRate || 0) >= 20.0);
  } else if (filterPriceTier.value === 'medium') {
    list = list.filter((c) => (c.liveRate || 0) >= 5.0 && (c.liveRate || 0) < 20.0);
  } else if (filterPriceTier.value === 'low') {
    list = list.filter((c) => (c.liveRate || 0) < 5.0);
  }

  // Steadiness tier filter
  if (filterStabilityTier.value === 'steady') {
    list = list.filter((c) => getSteadinessTier(c) === 'steady');
  } else if (filterStabilityTier.value === 'mixed') {
    list = list.filter((c) => getSteadinessTier(c) === 'mixed');
  } else if (filterStabilityTier.value === 'risky') {
    list = list.filter((c) => getSteadinessTier(c) === 'risky');
  }

  // Sorting
  if (filterCriteria.value === 'best_perform') {
    list.sort((a, b) => (b.percentageChange || 0) - (a.percentageChange || 0));
  } else if (filterCriteria.value === 'worst_perform') {
    list.sort((a, b) => (a.percentageChange || 0) - (b.percentageChange || 0));
  } else if (filterCriteria.value === 'stable') {
    list.sort((a, b) => (b.stabilityScore || 0) - (a.stabilityScore || 0));
  } else if (filterCriteria.value === 'volatile') {
    list.sort((a, b) => (a.stabilityScore || 0) - (b.stabilityScore || 0));
  } else if (filterCriteria.value === 'stable_high_val') {
    const maxRate = maxLiveRate.value;
    list.sort((a, b) => {
      const aNorm = (a.liveRate || 0) / maxRate;
      const bNorm = (b.liveRate || 0) / maxRate;
      const aScore = (a.stabilityScore || 0) * 1.0 + aNorm * 80.0;
      const bScore = (b.stabilityScore || 0) * 1.0 + bNorm * 80.0;
      return bScore - aScore;
    });
  } else {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  let limitValue = list.length;
  if (limitType.value === '5') limitValue = 5;
  else if (limitType.value === '10') limitValue = 10;
  else if (limitType.value === '20') limitValue = 20;
  else if (limitType.value === 'custom') limitValue = Math.max(1, customLimit.value);

  return list.slice(0, limitValue);
});

const pinnedCurrencies = computed(() => {
  if (!Array.isArray(pinnedFavorites.value)) return [];
  return props.currencies.filter((c) => pinnedFavorites.value.includes(c.id));
});

// Data Export
function downloadCSV() {
  const headers = [
    'ID',
    'Name',
    'Nation',
    'Standard Item',
    'Base Rate',
    'Live Rate',
    'Previous Rate',
    'Stability Score',
    'Percentage Change',
  ];
  const rows = filteredCurrencies.value.map((c) => [
    c.id,
    c.name,
    c.nation,
    c.standardItem,
    c.baseRate,
    c.liveRate,
    c.previousRate,
    c.stabilityScore,
    c.percentageChange,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `arcadia_currencies_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadJSON() {
  const jsonContent = JSON.stringify(filteredCurrencies.value, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `arcadia_currencies_${new Date().toISOString().split('T')[0]}.json`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

onMounted(() => {
  loadPinnedFavorites();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Time Interval Selector -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-900"
    >
      <div>
        <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
          <font-awesome-icon icon="coins" class="text-blue-500" />
          Live Currency Market
        </h2>
        <p class="text-[11px] text-slate-400 mt-0.5">
          Real-time exchange tracking and metrics calculated over the selected interval
        </p>
      </div>

      <div
        class="flex items-center gap-2 bg-slate-950 border border-slate-900 rounded-xl px-3 py-1.5 self-start sm:self-auto"
      >
        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Interval:</span>
        <select
          v-model="daysLimit"
          class="bg-slate-950 text-slate-300 text-xs font-semibold focus:outline-none cursor-pointer border-none"
        >
          <option :value="7" class="bg-slate-950 text-slate-300">Last 7 Days</option>
          <option :value="15" class="bg-slate-950 text-slate-300">Last 15 Days</option>
          <option :value="30" class="bg-slate-950 text-slate-300">Last 30 Days</option>
          <option :value="60" class="bg-slate-950 text-slate-300">Last 60 Days</option>
          <option :value="90" class="bg-slate-950 text-slate-300">Last 90 Days</option>
          <option :value="120" class="bg-slate-950 text-slate-300">Last 120 Days</option>
        </select>
      </div>
    </div>

    <!-- Top 5 Performers Side-by-Side -->
    <div v-if="topPerformers.length > 0">
      <h3
        class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"
      >
        <font-awesome-icon icon="arrow-trend-up" class="text-emerald-500" />
        Top 5 Best Currencies (Steady + High Value, Last {{ daysLimit }} Days)
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="curr in topPerformers"
          :key="'top-' + curr.id"
          class="bg-slate-950/40 border border-emerald-500/25 hover:border-emerald-500/40 rounded-xl p-4 shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden"
        >
          <div
            class="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-all duration-300"
          ></div>

          <div class="flex items-start justify-between">
            <div>
              <h4
                class="font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition-colors duration-200 truncate max-w-[110px]"
              >
                {{ curr.name }}
              </h4>
              <span
                class="text-[9px] text-slate-500 uppercase tracking-wider font-semibold truncate block max-w-[110px]"
              >
                {{ curr.nation || 'Unknown' }}
              </span>
            </div>
            <button
              @click="togglePin(curr.id)"
              class="text-[10px] transition-colors duration-150"
              :class="isPinned(curr.id) ? 'text-blue-500' : 'text-slate-600 hover:text-slate-400'"
            >
              <font-awesome-icon icon="star" />
            </button>
          </div>

          <div class="mt-3 flex items-end justify-between">
            <div>
              <span class="text-[9px] text-slate-500 uppercase font-semibold block">Live Rate</span>
              <div class="text-xs font-bold font-mono text-slate-200 mt-0.5">
                ₳{{ (curr.liveRate || 0).toFixed(3) }}
              </div>
            </div>
            <div
              :class="
                (curr.percentageChange || 0) > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : (curr.percentageChange || 0) < 0
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              "
              class="border px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-0.5 shadow-sm"
            >
              <font-awesome-icon
                :icon="(curr.percentageChange || 0) >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'"
              />
              {{ (curr.percentageChange || 0) >= 0 ? '+' : ''
              }}{{ (curr.percentageChange || 0).toFixed(1) }}%
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Pinned Watchlist -->
    <div v-if="pinnedCurrencies.length > 0">
      <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
        Pinned Watchlist
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="curr in pinnedCurrencies"
          :key="'pinned-' + curr.id"
          class="bg-[#11131c] border border-blue-500/30 rounded-xl p-4 shadow-md shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden"
        >
          <div
            class="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-blue-600/10 blur-xl group-hover:bg-blue-600/15 transition-all duration-300"
          ></div>

          <div class="flex items-start justify-between">
            <div>
              <h4
                class="font-bold text-slate-100 group-hover:text-blue-400 transition-colors duration-200"
              >
                {{ curr.name }}
              </h4>
              <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{{
                curr.nation || 'Unknown'
              }}</span>
            </div>
            <button
              @click="togglePin(curr.id)"
              class="text-blue-500 hover:text-slate-400 transition-colors duration-150"
            >
              <font-awesome-icon icon="star" />
            </button>
          </div>

          <div class="mt-4 flex items-end justify-between">
            <div>
              <span class="text-[10px] text-slate-500 uppercase font-semibold"
                >Live Exchange Rate</span
              >
              <div class="text-lg font-bold font-mono text-slate-200 mt-0.5">
                ₳{{ (curr.liveRate || 0).toFixed(3) }}
              </div>
            </div>
            <div
              :class="
                (curr.percentageChange || 0) > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : (curr.percentageChange || 0) < 0
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              "
              class="border px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 shadow-sm"
            >
              <font-awesome-icon
                :icon="(curr.percentageChange || 0) >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'"
              />
              {{ (curr.percentageChange || 0) >= 0 ? '+' : '' }}{{ (curr.percentageChange || 0).toFixed(2) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Analytics Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      <!-- Filters Sidebar -->
      <div
        class="lg:col-span-1 bg-[#11131c] border border-slate-800/80 rounded-2xl p-5 space-y-5 shadow-xl backdrop-blur-md"
      >
        <div class="flex items-center justify-between pb-3 border-b border-slate-800/50">
          <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
            <font-awesome-icon icon="filter" class="text-slate-400" />
            Filters & Limits
          </h3>
          <button
            @click="clearFilters"
            class="text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider transition-colors duration-150"
          >
            Reset
          </button>
        </div>

        <!-- Search -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Search</label
          >
          <div class="relative">
            <span
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"
            >
              <font-awesome-icon icon="search" />
            </span>
            <input
              type="text"
              v-model="searchSearch"
              placeholder="Search name, id, nation..."
              class="block w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Limits Filter -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Display Limit</label
          >
          <div
            class="grid grid-cols-5 bg-slate-950 border border-slate-800 rounded-lg p-0.5 gap-0.5 text-center"
          >
            <button
              @click="limitType = '5'"
              :class="
                limitType === '5' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              "
              class="py-1 rounded text-[10px] font-semibold transition-all duration-200"
            >
              Top 5
            </button>
            <button
              @click="limitType = '10'"
              :class="
                limitType === '10'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              "
              class="py-1 rounded text-[10px] font-semibold transition-all duration-200"
            >
              Top 10
            </button>
            <button
              @click="limitType = '20'"
              :class="
                limitType === '20'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              "
              class="py-1 rounded text-[10px] font-semibold transition-all duration-200"
            >
              Top 20
            </button>
            <button
              @click="limitType = 'all'"
              :class="
                limitType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              "
              class="py-1 rounded text-[10px] font-semibold transition-all duration-200"
            >
              All
            </button>
            <button
              @click="limitType = 'custom'"
              :class="
                limitType === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              "
              class="py-1 rounded text-[10px] font-semibold transition-all duration-200"
            >
              Custom
            </button>
          </div>

          <div v-if="limitType === 'custom'" class="mt-2 flex items-center gap-2">
            <span class="text-[10px] text-slate-500 font-semibold uppercase">Count:</span>
            <input
              type="number"
              v-model="customLimit"
              min="1"
              class="block w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Sorting Criteria -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Sorting Mode</label
          >
          <select
            v-model="filterCriteria"
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all" class="bg-slate-950 text-slate-200">Alphabetical (Name)</option>
            <option value="best_perform" class="bg-slate-950 text-slate-200">Biggest Gainers</option>
            <option value="worst_perform" class="bg-slate-950 text-slate-200">Biggest Losers</option>
            <option value="stable" class="bg-slate-950 text-slate-200">Most Steady (Fewest Swings)</option>
            <option value="volatile" class="bg-slate-950 text-slate-200">Most Unpredictable</option>
            <option value="stable_high_val" class="bg-slate-950 text-slate-200">Most Steady + High Value</option>
          </select>
        </div>

        <!-- Additional Filters -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Price Trend</label
          >
          <select
            v-model="filterPriceDir"
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all" class="bg-slate-950 text-slate-200">All Trends</option>
            <option value="gainers" class="bg-slate-950 text-slate-200">Only Upwards</option>
            <option value="losers" class="bg-slate-950 text-slate-200">Only Downwards</option>
            <option value="flat" class="bg-slate-950 text-slate-200">Only Unchanged</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Price Bracket</label
          >
          <select
            v-model="filterPriceTier"
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all" class="bg-slate-950 text-slate-200">All Prices</option>
            <option value="high" class="bg-slate-950 text-slate-200">High Value (≥ ₳20)</option>
            <option value="medium" class="bg-slate-950 text-slate-200">Medium Value (₳5 - ₳20)</option>
            <option value="low" class="bg-slate-950 text-slate-200">Low Value (&lt; ₳5)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Steady Tier</label
          >
          <select
            v-model="filterStabilityTier"
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all" class="bg-slate-950 text-slate-200">All Tiers</option>
            <option value="steady" class="bg-slate-950 text-slate-200">Steady (≥ 85%)</option>
            <option value="mixed" class="bg-slate-950 text-slate-200">Mixed (65% - 84%)</option>
            <option value="risky" class="bg-slate-950 text-slate-200">Risky (&lt; 65%)</option>
          </select>
        </div>

        <!-- Price Swing Alert -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <font-awesome-icon icon="triangle-exclamation" class="text-red-400" />
            Price Swing Alert
          </label>
          <p class="text-[10px] text-slate-500 leading-relaxed mb-3">
            Rows where the <span class="text-slate-300 font-semibold">Price Change</span> column
            exceeds your threshold will be
            <span class="text-red-400 font-semibold">highlighted in red</span>.
          </p>
          <div class="flex items-center gap-2.5">
            <span class="text-[9px] text-slate-600 font-mono font-bold w-6 text-right">5%</span>
            <input
              type="range"
              v-model="volatilityAlertThreshold"
              min="5"
              max="50"
              step="5"
              class="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <span class="text-[9px] text-slate-600 font-mono font-bold w-7">50%</span>
          </div>
          <div class="mt-2.5 flex items-center justify-center">
            <span class="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold font-mono px-3 py-1 rounded-lg flex items-center gap-1.5">
              <font-awesome-icon icon="bell" class="text-[8px]" />
              ≥ {{ volatilityAlertThreshold }}% triggers alert
            </span>
          </div>
        </div>

        <!-- Nations Filter -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nations</label>
          <div class="relative">
            <button
              @click.stop="nationsDropdownOpen = !nationsDropdownOpen; itemsDropdownOpen = false; nationsSearch = ''"
              class="w-full flex items-center justify-between bg-slate-950 border rounded-lg px-3 py-2 text-xs transition-colors duration-150"
              :class="nationsDropdownOpen ? 'border-blue-500/50 text-slate-200' : 'border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <span class="flex items-center gap-2">
                <font-awesome-icon icon="flag" class="text-slate-500 text-[10px]" />
                <span v-if="selectedNations.length === 0" class="text-slate-500">All Nations</span>
                <span v-else class="text-slate-200">{{ selectedNations.length }} selected</span>
              </span>
              <font-awesome-icon :icon="nationsDropdownOpen ? 'chevron-up' : 'chevron-down'" class="text-slate-500 text-[9px]" />
            </button>

            <div v-if="nationsDropdownOpen" @click="nationsDropdownOpen = false" class="fixed inset-0 z-10"></div>

            <Transition
              enter-from-class="opacity-0 -translate-y-1"
              enter-active-class="transition-all duration-200 ease-out"
              enter-to-class="opacity-100 translate-y-0"
              leave-from-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="nationsDropdownOpen"
                class="absolute left-0 right-0 mt-1.5 z-20 bg-[#0d0f17] border border-slate-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
              >
                <div class="px-3 py-2 border-b border-slate-800/50 flex items-center justify-between">
                  <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Select Nations</span>
                  <button
                    v-if="selectedNations.length > 0"
                    @click="selectedNations = []"
                    class="text-[9px] text-red-400/70 hover:text-red-400 font-semibold transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div class="px-2.5 pt-1.5 pb-1 border-b border-slate-800/30">
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-600">
                      <font-awesome-icon icon="search" class="text-[9px]" />
                    </span>
                    <input
                      type="text"
                      v-model="nationsSearch"
                      placeholder="Search nations..."
                      class="block w-full bg-slate-950/50 border border-slate-800/50 rounded-lg pl-7 pr-2.5 py-1.5 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/40"
                    />
                  </div>
                </div>
                <div class="max-h-[180px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                  <button
                    v-for="nation in filteredNationsList"
                    :key="'dd-nation-' + nation"
                    @click="toggleNationFilter(nation)"
                    class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                    :class="selectedNations.includes(nation)
                      ? 'bg-blue-500/10 text-blue-300'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'"
                  >
                    <span
                      class="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150"
                      :class="selectedNations.includes(nation)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-600'"
                    >
                      <font-awesome-icon v-if="selectedNations.includes(nation)" icon="check" class="text-[7px] text-white" />
                    </span>
                    {{ nation.replace(/_/g, ' ') }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Backing Items Filter -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Backing Items</label>
          <div class="relative">
            <button
              @click.stop="itemsDropdownOpen = !itemsDropdownOpen; nationsDropdownOpen = false; itemsSearch = ''"
              class="w-full flex items-center justify-between bg-slate-950 border rounded-lg px-3 py-2 text-xs transition-colors duration-150"
              :class="itemsDropdownOpen ? 'border-emerald-500/50 text-slate-200' : 'border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <span class="flex items-center gap-2">
                <font-awesome-icon icon="cube" class="text-slate-500 text-[10px]" />
                <span v-if="selectedItems.length === 0" class="text-slate-500">All Items</span>
                <span v-else class="text-slate-200">{{ selectedItems.length }} selected</span>
              </span>
              <font-awesome-icon :icon="itemsDropdownOpen ? 'chevron-up' : 'chevron-down'" class="text-slate-500 text-[9px]" />
            </button>

            <div v-if="itemsDropdownOpen" @click="itemsDropdownOpen = false" class="fixed inset-0 z-10"></div>

            <Transition
              enter-from-class="opacity-0 -translate-y-1"
              enter-active-class="transition-all duration-200 ease-out"
              enter-to-class="opacity-100 translate-y-0"
              leave-from-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="itemsDropdownOpen"
                class="absolute left-0 right-0 mt-1.5 z-20 bg-[#0d0f17] border border-slate-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
              >
                <div class="px-3 py-2 border-b border-slate-800/50 flex items-center justify-between">
                  <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Select Items</span>
                  <button
                    v-if="selectedItems.length > 0"
                    @click="selectedItems = []"
                    class="text-[9px] text-red-400/70 hover:text-red-400 font-semibold transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div class="px-2.5 pt-1.5 pb-1 border-b border-slate-800/30">
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-600">
                      <font-awesome-icon icon="search" class="text-[9px]" />
                    </span>
                    <input
                      type="text"
                      v-model="itemsSearch"
                      placeholder="Search items..."
                      class="block w-full bg-slate-950/50 border border-slate-800/50 rounded-lg pl-7 pr-2.5 py-1.5 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                </div>
                <div class="max-h-[180px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                  <button
                    v-for="item in filteredItemsList"
                    :key="'dd-item-' + item"
                    @click="toggleItemFilter(item)"
                    class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                    :class="selectedItems.includes(item)
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'"
                  >
                    <span
                      class="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150"
                      :class="selectedItems.includes(item)
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-600'"
                    >
                      <font-awesome-icon v-if="selectedItems.includes(item)" icon="check" class="text-[7px] text-white" />
                    </span>
                    {{ item.replace(/_/g, ' ') }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Monitor Grid View -->
      <div class="lg:col-span-3 space-y-4">
        <div
          class="bg-[#11131c] border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-md"
        >
          <div class="text-center sm:text-left">
            <div class="text-xs text-slate-400 font-semibold">Active Market Coverage</div>
            <div class="text-lg font-bold text-slate-200 mt-0.5">
              Viewing
              <span class="text-blue-500 font-mono">{{ filteredCurrencies.length }}</span> of
              <span class="text-slate-400 font-mono">{{ currencies.length }}</span>
              nation currencies
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="downloadCSV"
              class="bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all duration-150"
            >
              <font-awesome-icon icon="download" />
              Export CSV
            </button>
            <button
              @click="downloadJSON"
              class="bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all duration-150"
            >
              <font-awesome-icon icon="download" />
              Export JSON
            </button>
          </div>
        </div>

        <!-- Main Data Table -->
        <div
          class="bg-[#11131c] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr
                  class="bg-slate-950 border-b border-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-wider"
                >
                  <th class="py-3.5 px-4 text-center w-12">Watch</th>
                  <th class="py-3.5 px-4">Currency</th>
                  <th class="py-3.5 px-4">Creator / Nation</th>
                  <th class="py-3.5 px-4">Base Rate</th>
                  <th class="py-3.5 px-4">Live Rate</th>
                  <th class="py-3.5 px-4">How Steady</th>
                  <th class="py-3.5 px-4 text-right">Price Change</th>
                </tr>
              </thead>
              <TransitionGroup
                name="row-list"
                tag="tbody"
                class="divide-y divide-slate-900/50"
              >
                <tr
                  v-for="curr in filteredCurrencies"
                  :key="curr.id"
                  :class="[
                    Math.abs(curr.percentageChange || 0) >= volatilityAlertThreshold
                      ? 'bg-red-500/5 hover:bg-red-500/10 hover:scale-[1.002] hover:shadow-lg'
                      : 'hover:bg-slate-900/40 hover:scale-[1.002] hover:shadow-lg',
                    'transition-all duration-150 group',
                  ]"
                >
                  <td class="py-3.5 px-4 text-center">
                    <button
                      @click="togglePin(curr.id)"
                      class="text-xs transition-colors duration-150"
                      :class="
                        isPinned(curr.id) ? 'text-blue-500' : 'text-slate-600 hover:text-slate-400'
                      "
                    >
                      <font-awesome-icon icon="star" />
                    </button>
                  </td>

                  <td class="py-3.5 px-4">
                    <div
                      class="font-bold text-slate-200 group-hover:text-blue-400 transition-colors duration-150"
                    >
                      {{ curr.name }}
                    </div>
                    <div
                      class="text-[10px] font-mono text-slate-500 uppercase tracking-wide mt-0.5"
                    >
                      Backed by: {{ (curr.standardItem || '').replace(/_/g, ' ') }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="text-xs font-semibold text-slate-300">
                      {{ (curr.nation || '').replace(/_/g, ' ') }}
                    </div>
                    <div class="text-[9px] font-mono text-slate-500 mt-0.5">
                      UUID: {{ (curr.creatorUuid || '').substring(0, 8) }}...
                    </div>
                  </td>

                  <td class="py-3.5 px-4 font-mono text-xs text-slate-400">
                    ₳{{ (curr.baseRate || 0).toFixed(4) }}
                  </td>

                  <td class="py-3.5 px-4 font-mono text-xs font-bold text-slate-200">
                    ₳{{ (curr.liveRate || 0).toFixed(4) }}
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                      <span
                        :class="
                          getSteadinessTier(curr) === 'steady'
                            ? 'text-emerald-400'
                            : getSteadinessTier(curr) === 'mixed'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        "
                        class="text-xs font-mono font-bold"
                      >
                        {{ curr.stabilityScore ?? 0 }}%
                      </span>
                      <span
                        :class="
                          getSteadinessTier(curr) === 'steady'
                            ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                            : getSteadinessTier(curr) === 'mixed'
                              ? 'bg-amber-500/15 border-amber-500/20 text-amber-400'
                              : 'bg-red-500/15 border-red-500/20 text-red-400'
                        "
                        class="border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                      >
                        {{
                          getSteadinessTier(curr) === 'steady'
                            ? 'Steady'
                            : getSteadinessTier(curr) === 'mixed'
                              ? 'Mixed'
                              : 'Risky'
                        }}
                      </span>
                    </div>
                    <div class="text-[9px] text-slate-500 mt-0.5 font-mono">
                      Price Spread: {{ (curr.stdDev || 0).toFixed(4) }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <div
                      :class="
                        (curr.percentageChange || 0) > 0
                          ? 'text-emerald-400'
                          : (curr.percentageChange || 0) < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                      "
                      class="font-mono text-xs font-bold"
                    >
                      <font-awesome-icon
                        :icon="(curr.percentageChange || 0) >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'"
                        class="text-[10px] mr-1"
                      />
                      {{ (curr.percentageChange || 0) >= 0 ? '+' : ''
                      }}{{ (curr.percentageChange || 0).toFixed(2) }}%
                    </div>
                    <div
                      v-if="Math.abs(curr.percentageChange || 0) >= volatilityAlertThreshold"
                      class="text-[8px] text-red-400 uppercase font-bold tracking-widest mt-0.5"
                    >
                      <font-awesome-icon icon="triangle-exclamation" class="mr-0.5" /> Big
                      Change
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredCurrencies.length === 0" key="empty-row">
                  <td colspan="7" class="py-12 px-4 text-center">
                    <font-awesome-icon icon="circle-info" class="text-3xl text-slate-600 mb-2" />
                    <h4 class="text-sm font-semibold text-slate-300">No Matching Currencies</h4>
                    <p class="text-xs text-slate-500 mt-1">
                      Try clearing your searches or category filters.
                    </p>
                  </td>
                </tr>
              </TransitionGroup>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Premium Table Row Enter/Leave Transitions */
.row-list-enter-active,
.row-list-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.row-list-enter-from {
  opacity: 0;
  transform: translateX(-4px);
}
.row-list-leave-to {
  opacity: 0;
  transform: translateX(4px);
}
.row-list-move {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>

