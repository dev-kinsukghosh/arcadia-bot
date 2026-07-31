<script setup>
import { ref, computed, onMounted } from 'vue';

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

// Filters
const limitType = ref('10'); // '5', '10', '20', 'all', 'custom'
const customLimit = ref(15);
const filterCriteria = ref('all'); // 'all', 'best_perform', 'worst_perform', 'stable', 'volatile'
const searchSearch = ref('');
const selectedNations = ref([]);
const selectedItems = ref([]);
const volatilityAlertThreshold = ref(15);

// Watchlist
const pinnedFavorites = ref([]);

function loadPinnedFavorites() {
  const saved = localStorage.getItem('currencies:favorites');
  if (saved) {
    try {
      pinnedFavorites.value = JSON.parse(saved);
    } catch {
      pinnedFavorites.value = [];
    }
  }
}

function togglePin(id) {
  const idx = pinnedFavorites.value.indexOf(id);
  if (idx > -1) {
    pinnedFavorites.value.splice(idx, 1);
  } else {
    pinnedFavorites.value.push(id);
  }
  localStorage.setItem('currencies:favorites', JSON.stringify(pinnedFavorites.value));
}

function clearFilters() {
  limitType.value = '10';
  customLimit.value = 15;
  filterCriteria.value = 'all';
  searchSearch.value = '';
  selectedNations.value = [];
  selectedItems.value = [];
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

// Computeds
const uniqueNations = computed(() => {
  return [...new Set(props.currencies.map((c) => c.nation).filter(Boolean))].sort();
});

const uniqueItems = computed(() => {
  return [...new Set(props.currencies.map((c) => c.standardItem).filter(Boolean))].sort();
});

const filteredCurrencies = computed(() => {
  let list = [...props.currencies];

  if (searchSearch.value) {
    const query = searchSearch.value.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.nation.toLowerCase().includes(query)
    );
  }

  if (selectedNations.value.length > 0) {
    list = list.filter((c) => selectedNations.value.includes(c.nation));
  }

  if (selectedItems.value.length > 0) {
    list = list.filter((c) => selectedItems.value.includes(c.standardItem));
  }

  if (filterCriteria.value === 'best_perform') {
    list.sort((a, b) => b.percentageChange - a.percentageChange);
  } else if (filterCriteria.value === 'worst_perform') {
    list.sort((a, b) => a.percentageChange - b.percentageChange);
  } else if (filterCriteria.value === 'stable') {
    list.sort((a, b) => b.stabilityScore - a.stabilityScore);
  } else if (filterCriteria.value === 'volatile') {
    list.sort((a, b) => a.stabilityScore - b.stabilityScore);
  } else {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  let limitValue = list.length;
  if (limitType.value === '5') limitValue = 5;
  else if (limitType.value === '10') limitValue = 10;
  else if (limitType.value === '20') limitValue = 20;
  else if (limitType.value === 'custom') limitValue = Math.max(1, customLimit.value);

  return list.slice(0, limitValue);
});

const pinnedCurrencies = computed(() => {
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
                curr.nation
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
                ₳{{ curr.liveRate.toFixed(3) }}
              </div>
            </div>
            <div
              :class="
                curr.percentageChange > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : curr.percentageChange < 0
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              "
              class="border px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 shadow-sm"
            >
              <font-awesome-icon
                :icon="curr.percentageChange >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'"
              />
              {{ curr.percentageChange >= 0 ? '+' : '' }}{{ curr.percentageChange.toFixed(2) }}%
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
            <option value="all">Alphabetical (Name)</option>
            <option value="best_perform">Best Performing (Rate Gain)</option>
            <option value="worst_perform">Worst Performing (Rate Loss)</option>
            <option value="stable">Highest Stability (Low Volatility)</option>
            <option value="volatile">Lowest Stability (High Volatility)</option>
          </select>
        </div>

        <!-- Volatility Trigger Config -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Volatility Alert Trigger</label
          >
          <div class="flex items-center gap-2">
            <input
              type="range"
              v-model="volatilityAlertThreshold"
              min="5"
              max="50"
              step="5"
              class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span class="text-xs font-mono font-bold text-slate-300"
              >{{ volatilityAlertThreshold }}%</span
            >
          </div>
          <span class="text-[9px] text-slate-500 block mt-1"
            >Highlights rows shifting beyond this threshold</span
          >
        </div>

        <!-- Nations Filter List -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Nations Tag Selection</label
          >
          <div class="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
            <button
              v-for="nation in uniqueNations"
              :key="'tag-nation-' + nation"
              @click="toggleNationFilter(nation)"
              :class="
                selectedNations.includes(nation)
                  ? 'bg-blue-600/35 border-blue-500 text-blue-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              "
              class="border text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-150"
            >
              {{ nation.replace(/_/g, ' ') }}
            </button>
          </div>
        </div>

        <!-- Backing Items Filter List -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >Backing Items Tag Selection</label
          >
          <div class="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
            <button
              v-for="item in uniqueItems"
              :key="'tag-item-' + item"
              @click="toggleItemFilter(item)"
              :class="
                selectedItems.includes(item)
                  ? 'bg-emerald-600/35 border-emerald-500 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              "
              class="border text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-150"
            >
              {{ item.replace(/_/g, ' ') }}
            </button>
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
              class="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all duration-150"
            >
              <font-awesome-icon icon="download" />
              Export CSV
            </button>
            <button
              @click="downloadJSON"
              class="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all duration-150"
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
                  class="bg-slate-950 border-b border-slate-850 text-slate-400 text-[10px] font-bold uppercase tracking-wider"
                >
                  <th class="py-3.5 px-4 text-center w-12">Watch</th>
                  <th class="py-3.5 px-4">Currency</th>
                  <th class="py-3.5 px-4">Creator / Nation</th>
                  <th class="py-3.5 px-4">Base Rate</th>
                  <th class="py-3.5 px-4">Live Rate</th>
                  <th class="py-3.5 px-4">Stability Index</th>
                  <th class="py-3.5 px-4 text-right">Rate Shift</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-850/50">
                <tr
                  v-for="curr in filteredCurrencies"
                  :key="curr.id"
                  :class="[
                    Math.abs(curr.percentageChange) >= volatilityAlertThreshold
                      ? 'bg-red-500/5 hover:bg-red-500/10'
                      : 'hover:bg-slate-900/40',
                    'transition-colors duration-150 group',
                  ]"
                >
                  <td class="py-3.5 px-4 text-center">
                    <button
                      @click="togglePin(curr.id)"
                      class="text-xs transition-colors duration-150"
                      :class="
                        pinnedFavorites.includes(curr.id)
                          ? 'text-blue-500'
                          : 'text-slate-600 hover:text-slate-400'
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
                      Backed by: {{ curr.standardItem.replace(/_/g, ' ') }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="text-xs font-semibold text-slate-300">
                      {{ curr.nation.replace(/_/g, ' ') }}
                    </div>
                    <div class="text-[9px] font-mono text-slate-500 mt-0.5">
                      UUID: {{ curr.creatorUuid.substring(0, 8) }}...
                    </div>
                  </td>

                  <td class="py-3.5 px-4 font-mono text-xs text-slate-400">
                    ₳{{ curr.baseRate.toFixed(4) }}
                  </td>

                  <td class="py-3.5 px-4 font-mono text-xs font-bold text-slate-200">
                    ₳{{ curr.liveRate.toFixed(4) }}
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                      <span
                        :class="
                          curr.stabilityScore >= 85
                            ? 'text-emerald-400'
                            : curr.stabilityScore >= 65
                              ? 'text-amber-400'
                              : 'text-red-400'
                        "
                        class="text-xs font-mono font-bold"
                      >
                        {{ curr.stabilityScore }}%
                      </span>
                      <span
                        :class="
                          curr.stabilityScore >= 85
                            ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                            : curr.stabilityScore >= 65
                              ? 'bg-amber-500/15 border-amber-500/20 text-amber-400'
                              : 'bg-red-500/15 border-red-500/20 text-red-400'
                        "
                        class="border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                      >
                        {{
                          curr.stabilityScore >= 85
                            ? 'Stable'
                            : curr.stabilityScore >= 65
                              ? 'Medium'
                              : 'Volatile'
                        }}
                      </span>
                    </div>
                    <div class="text-[9px] text-slate-500 mt-0.5 font-mono">
                      Volatility (StdDev): {{ curr.stdDev.toFixed(4) }}
                    </div>
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <div
                      :class="
                        curr.percentageChange > 0
                          ? 'text-emerald-400'
                          : curr.percentageChange < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                      "
                      class="font-mono text-xs font-bold"
                    >
                      <font-awesome-icon
                        :icon="curr.percentageChange >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'"
                        class="text-[10px] mr-1"
                      />
                      {{ curr.percentageChange >= 0 ? '+' : ''
                      }}{{ curr.percentageChange.toFixed(2) }}%
                    </div>
                    <div
                      v-if="Math.abs(curr.percentageChange) >= volatilityAlertThreshold"
                      class="text-[8px] text-red-400 uppercase font-bold tracking-widest mt-0.5"
                    >
                      <font-awesome-icon icon="triangle-exclamation" class="mr-0.5" /> High
                      Deviation
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredCurrencies.length === 0">
                  <td colspan="7" class="py-12 px-4 text-center">
                    <font-awesome-icon icon="circle-info" class="text-3xl text-slate-600 mb-2" />
                    <h4 class="text-sm font-semibold text-slate-300">No Matching Currencies</h4>
                    <p class="text-xs text-slate-500 mt-1">
                      Try clearing your searches or category filters.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
