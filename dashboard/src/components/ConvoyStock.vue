<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const props = defineProps({
  apiBase: {
    type: String,
    required: true,
  },
});

const convoyItems = ref([]);
const isLoading = ref(true);
const fetchError = ref(null);
const searchQuery = ref('');
const activeRarityFilter = ref('all');
const activeSubView = ref('live'); // 'live' or 'all'

async function fetchConvoyData() {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const res = await axios.get(`${props.apiBase}/currencies/convoy/all`);
    convoyItems.value = res.data.map(item => ({
      ...item,
      imageError: false
    }));
  } catch (err) {
    console.error('Failed to fetch convoy stock:', err);
    fetchError.value = 'Could not load convoy stock trades. Is the backend server running?';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchConvoyData();
});

// Helper to format item name (e.g. OAK_CHEST_BOAT -> Oak Chest Boat)
function formatItemName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Live stock items (active right now)
const liveItems = computed(() => {
  return convoyItems.value.filter(item => item.current_p);
});

// Group Live items by rarity for distinct sections
const liveItemsByRarity = computed(() => {
  const groups = {
    'Legendary': [],
    'Epic': [],
    'Rare': [],
    'Uncommon': [],
    'Common': []
  };

  liveItems.value.forEach(item => {
    const key = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1).toLowerCase();
    if (groups[key] !== undefined) {
      groups[key].push(item);
    } else {
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
  });

  return Object.keys(groups)
    .filter(r => groups[r].length > 0)
    .reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {});
});

// Compute unique rarities tracked
const uniqueRarities = computed(() => {
  const rarities = convoyItems.value.map(item => item.rarity);
  return ['all', ...new Set(rarities)];
});

// Filtered catalog list
const filteredItems = computed(() => {
  let list = [...convoyItems.value];

  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(item =>
      item.item.toLowerCase().replace(/_/g, ' ').includes(q) ||
      item.rarity.toLowerCase().includes(q)
    );
  }

  // Rarity filter
  if (activeRarityFilter.value !== 'all') {
    list = list.filter(item => item.rarity === activeRarityFilter.value);
  }

  return list;
});

// Group catalog items by rarity for sections
const catalogItemsByRarity = computed(() => {
  const groups = {
    'Legendary': [],
    'Epic': [],
    'Rare': [],
    'Uncommon': [],
    'Common': []
  };

  filteredItems.value.forEach(item => {
    const key = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1).toLowerCase();
    if (groups[key] !== undefined) {
      groups[key].push(item);
    } else {
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
  });

  return Object.keys(groups)
    .filter(r => groups[r].length > 0)
    .reduce((obj, key) => {
      obj[key] = groups[key].sort((a, b) => a.item.localeCompare(b.item));
      return obj;
    }, {});
});

// Helper for card styles by rarity
function getRarityClasses(rarity) {
  const r = rarity.toLowerCase();
  if (r === 'legendary') {
    return 'border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 shadow-amber-500/5 hover:scale-[1.02] hover:shadow-amber-500/10';
  }
  if (r === 'epic') {
    return 'border-purple-500/25 bg-purple-500/5 hover:border-purple-500/40 shadow-purple-500/5 hover:scale-[1.02] hover:shadow-purple-500/10';
  }
  if (r === 'rare') {
    return 'border-blue-500/25 bg-blue-500/5 hover:border-blue-500/40 shadow-blue-500/5 hover:scale-[1.02] hover:shadow-blue-500/10';
  }
  if (r === 'uncommon') {
    return 'border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40 shadow-emerald-500/5 hover:scale-[1.02] hover:shadow-emerald-500/10';
  }
  return 'border-slate-800 bg-slate-950/40 hover:border-slate-700 shadow-slate-900/10 hover:scale-[1.02] hover:shadow-slate-950/40';
}

// Helper for text colors by rarity
function getRarityTextClass(rarity) {
  const r = rarity.toLowerCase();
  if (r === 'legendary') return 'text-amber-400';
  if (r === 'epic') return 'text-purple-400';
  if (r === 'rare') return 'text-blue-400';
  if (r === 'uncommon') return 'text-emerald-400';
  return 'text-slate-400';
}

// Helper for bullet indicators in section headers
function getRarityDotBg(rarity) {
  const r = rarity.toLowerCase();
  if (r === 'legendary') return 'bg-amber-500';
  if (r === 'epic') return 'bg-purple-500';
  if (r === 'rare') return 'bg-blue-500';
  if (r === 'uncommon') return 'bg-emerald-500';
  return 'bg-slate-500';
}

function handleImageError(item) {
  item.imageError = true;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Block -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-900">
      <div>
        <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
          <font-awesome-icon icon="cube" class="text-blue-500" />
          Convoy Shop Monitor
        </h2>
        <p class="text-[11px] text-slate-400 mt-0.5">
          Real-time active shop rotations and complete tracked item catalogs grouped by rarity tiers
        </p>
      </div>

      <button
        @click="fetchConvoyData"
        class="bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-150 self-start sm:self-auto cursor-pointer"
      >
        <font-awesome-icon icon="rotate" :spin="isLoading" />
        Sync Stock
      </button>
    </div>

    <!-- Segmented Control View Selector -->
    <div class="flex bg-slate-950/85 border border-slate-900 rounded-xl p-1 max-w-[280px]">
      <button
        @click="activeSubView = 'live'"
        :class="
          activeSubView === 'live'
            ? 'bg-slate-900 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        "
        class="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-center"
      >
        Convoy Live
      </button>
      <button
        @click="activeSubView = 'all'"
        :class="
          activeSubView === 'all'
            ? 'bg-slate-900 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        "
        class="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-center"
      >
        All Items
      </button>
    </div>

    <!-- Loading / Error states -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-24">
      <font-awesome-icon icon="rotate" spin class="text-3xl text-blue-500 mb-3" />
      <span class="text-xs text-slate-400 font-semibold">Loading convoy database records...</span>
    </div>

    <div v-else-if="fetchError" class="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
      <font-awesome-icon icon="triangle-exclamation" class="text-2xl mb-2" />
      <h4 class="text-sm font-semibold">{{ fetchError }}</h4>
    </div>

    <!-- Active Sections -->
    <div v-else>
      <Transition name="fade" mode="out-in">
        
        <!-- ================= SECTION 1: LIVE SHOP TRADES ================= -->
        <div v-if="activeSubView === 'live'" key="view-live" class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-900/60 pb-2">
            <div class="flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Shop Trades</h3>
            </div>
            <span class="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {{ liveItems.length }} active rotations
            </span>
          </div>

          <div v-if="liveItems.length === 0" class="bg-[#11131c]/40 border border-slate-800/80 rounded-2xl py-12 text-center text-slate-500 text-xs">
            <font-awesome-icon icon="circle-info" class="text-xl mb-1.5 text-slate-600" />
            <div>No items currently active in the shop rotation.</div>
          </div>

          <div v-else class="space-y-8">
            <div v-for="(items, rarity) in liveItemsByRarity" :key="'live-group-' + rarity" class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider flex items-center gap-2" :class="getRarityTextClass(rarity)">
                <span class="w-1.5 h-1.5 rounded-full animate-pulse" :class="getRarityDotBg(rarity)"></span>
                {{ rarity }} Tier
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div
                  v-for="item in items"
                  :key="'live-' + item.item"
                  class="border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between shadow-lg hover:-translate-y-1 relative group overflow-hidden bg-slate-950/20"
                  :class="getRarityClasses(item.rarity)"
                >
                  <!-- Card Rarity Badge -->
                  <div class="flex items-center justify-between mb-3.5">
                    <span
                      class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border capitalize bg-slate-950/60"
                      :class="[getRarityTextClass(item.rarity), getRarityClasses(item.rarity).split(' ')[0]]"
                    >
                      {{ item.rarity.toLowerCase() }}
                    </span>
                    <span class="text-[9px] text-slate-500 font-mono">Seen: {{ item.timesSeen }}x</span>
                  </div>

                  <!-- Item Texture Area -->
                  <div class="flex items-center justify-center py-4 bg-slate-950/20 rounded-xl mb-4 border border-slate-900/30 min-h-[96px] relative">
                    <img
                      v-if="!item.imageError"
                      :src="'/icons/' + item.item + '.png'"
                      @error="handleImageError(item)"
                      class="w-14 h-14 object-contain image-rendering-pixelated group-hover:scale-110 transition-transform duration-300"
                      :alt="item.item"
                    />
                    <div v-else class="flex flex-col items-center gap-1.5 text-slate-600">
                      <font-awesome-icon icon="cube" class="text-3xl text-slate-600" />
                      <span class="text-[8px] font-mono tracking-wider">NO TEXTURE</span>
                    </div>
                  </div>

                  <!-- Item Info -->
                  <div class="space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 class="text-xs font-bold text-slate-200 tracking-tight group-hover:text-blue-400 transition-colors duration-150 truncate">
                        {{ formatItemName(item.item) }}
                      </h4>
                      <p class="text-[8px] font-mono text-slate-600 mt-0.5 truncate uppercase">
                        ID: {{ item.item }}
                      </p>
                    </div>

                    <!-- Price Pills -->
                    <div class="grid grid-cols-2 gap-2 text-center">
                      <div class="bg-[#0b0c10] border border-slate-900 rounded-lg p-1">
                        <div class="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Buy</div>
                        <div class="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                          ₳{{ parseFloat(item.buyPrice).toFixed(2) }}
                        </div>
                      </div>
                      <div class="bg-[#0b0c10] border border-slate-900 rounded-lg p-1">
                        <div class="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Sell</div>
                        <div class="text-[10px] font-mono font-bold text-slate-300 mt-0.5">
                          ₳{{ parseFloat(item.sellPrice).toFixed(2) }}
                        </div>
                      </div>
                    </div>

                    <!-- Stock Progress -->
                    <div>
                      <div class="flex items-center justify-between text-[9px] text-slate-400 mb-1 font-medium">
                        <span>Current Stock</span>
                        <span class="font-mono text-slate-200">{{ item.stock }} / {{ item.maxStock }}</span>
                      </div>
                      <div class="h-1 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="[
                            (item.stock / item.maxStock) >= 0.5
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : (item.stock / item.maxStock) >= 0.2
                                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                          ]"
                          :style="{ width: (item.stock / item.maxStock * 100) + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= SECTION 2: ALL REGISTERED ITEMS ================= -->
        <div v-else-if="activeSubView === 'all'" key="view-all" class="space-y-4">
          <div class="flex items-center gap-2 border-b border-slate-900/60 pb-2">
            <font-awesome-icon icon="globe" class="text-blue-500/80" />
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">All Tracked Items</h3>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <!-- Filters & Search -->
            <div class="lg:col-span-1 bg-[#11131c] border border-slate-800/80 rounded-2xl p-5 space-y-5 shadow-xl backdrop-blur-md">
              <div class="flex items-center justify-between pb-3 border-b border-slate-800/50">
                <h4 class="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <font-awesome-icon icon="filter" class="text-slate-400" />
                  Catalog Filters
                </h4>
                <button
                  @click="searchQuery = ''; activeRarityFilter = 'all'"
                  class="text-[9px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider transition-colors duration-150 cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <!-- Search input -->
              <div>
                <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search Catalog</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-[10px]">
                    <font-awesome-icon icon="search" />
                  </span>
                  <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="Search item name..."
                    class="block w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <!-- Rarity Filters -->
              <div>
                <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Rarity Tier</label>
                <div class="space-y-1">
                  <button
                    @click="activeRarityFilter = 'all'"
                    :class="activeRarityFilter === 'all' ? 'bg-blue-600/15 border-blue-500/30 text-blue-300' : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'"
                    class="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-between transition-all duration-150 cursor-pointer"
                  >
                    <span>All Rarities</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 font-mono text-slate-500">{{ convoyItems.length }}</span>
                  </button>
                  <button
                    v-for="rarity in uniqueRarities.filter(r => r !== 'all')"
                    :key="'filter-' + rarity"
                    @click="activeRarityFilter = rarity"
                    :class="activeRarityFilter === rarity ? 'bg-blue-600/15 border-blue-500/30 text-blue-300' : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'"
                    class="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-between transition-all duration-150 cursor-pointer capitalize"
                  >
                    <span :class="getRarityTextClass(rarity)">{{ rarity.toLowerCase() }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 font-mono text-slate-500">
                      {{ convoyItems.filter(item => item.rarity === rarity).length }}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Catalog Cards Grouped by Rarity Sections -->
            <div class="lg:col-span-3 space-y-8">
              <div class="bg-[#11131c] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg backdrop-blur-md">
                <div>
                  <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Catalog Coverage</div>
                  <div class="text-xs font-bold text-slate-200 mt-0.5">
                    Showing <span class="text-blue-500 font-mono">{{ filteredItems.length }}</span> of <span class="text-slate-400 font-mono">{{ convoyItems.length }}</span> registered convoy items
                  </div>
                </div>
              </div>

              <div v-if="filteredItems.length === 0" class="bg-[#11131c] border border-slate-800/80 rounded-2xl py-16 px-4 text-center">
                <font-awesome-icon icon="circle-info" class="text-2xl text-slate-600 mb-2" />
                <h4 class="text-xs font-semibold text-slate-300">No Matching Items Found</h4>
                <p class="text-[11px] text-slate-500 mt-1">Try clearing filters or search terms.</p>
              </div>

              <div v-else class="space-y-8">
                <div v-for="(items, rarity) in catalogItemsByRarity" :key="'catalog-group-' + rarity" class="space-y-3">
                  <h4 class="text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-1" :class="getRarityTextClass(rarity)">
                    <span class="w-1.5 h-1.5 rounded-full" :class="getRarityDotBg(rarity)"></span>
                    {{ rarity }} Items
                    <span class="text-[9px] font-mono text-slate-500 font-normal ml-1">({{ items.length }})</span>
                  </h4>

                  <TransitionGroup
                    name="card-list"
                    tag="div"
                    class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                  >
                    <div
                      v-for="item in items"
                      :key="'all-' + item.item"
                      class="border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between shadow-lg hover:-translate-y-1 relative group overflow-hidden"
                      :class="getRarityClasses(item.rarity)"
                    >
                      <!-- Card Rarity / Status Badge -->
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-1.5">
                          <span
                            class="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border capitalize bg-slate-950/60"
                            :class="[getRarityTextClass(item.rarity), getRarityClasses(item.rarity).split(' ')[0]]"
                          >
                            {{ item.rarity.toLowerCase() }}
                          </span>
                          <span
                            :class="item.current_p ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-slate-950/50 border-slate-900 text-slate-500'"
                            class="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                          >
                            {{ item.current_p ? 'Active' : 'Inactive' }}
                          </span>
                        </div>
                        <span class="text-[8px] text-slate-500 font-mono">Seen: {{ item.timesSeen }}x</span>
                      </div>

                      <!-- Item Texture Area -->
                      <div class="flex items-center justify-center py-3 bg-slate-950/20 rounded-xl mb-3 border border-slate-900/30 min-h-[84px] relative">
                        <img
                          v-if="!item.imageError"
                          :src="'/icons/' + item.item + '.png'"
                          @error="handleImageError(item)"
                          class="w-12 h-12 object-contain image-rendering-pixelated group-hover:scale-110 transition-transform duration-300"
                          :alt="item.item"
                        />
                        <div v-else class="flex flex-col items-center gap-1 text-slate-600">
                          <font-awesome-icon icon="cube" class="text-2xl text-slate-600" />
                          <span class="text-[8px] font-mono tracking-wider">NO TEXTURE</span>
                        </div>
                      </div>

                      <!-- Item Info -->
                      <div class="space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 class="text-xs font-bold text-slate-200 tracking-tight group-hover:text-blue-400 transition-colors duration-150 truncate">
                            {{ formatItemName(item.item) }}
                          </h4>
                          <p class="text-[8px] font-mono text-slate-600 mt-0.5 truncate uppercase">
                            ID: {{ item.item }}
                          </p>
                        </div>

                        <!-- Price Pills -->
                        <div class="grid grid-cols-2 gap-2 text-center">
                          <div class="bg-[#0b0c10] border border-slate-900 rounded-lg p-1">
                            <div class="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Buy</div>
                            <div class="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                              ₳{{ parseFloat(item.buyPrice).toFixed(2) }}
                            </div>
                          </div>
                          <div class="bg-[#0b0c10] border border-slate-900 rounded-lg p-1">
                            <div class="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Sell</div>
                            <div class="text-[10px] font-mono font-bold text-slate-300 mt-0.5">
                              ₳{{ parseFloat(item.sellPrice).toFixed(2) }}
                            </div>
                          </div>
                        </div>

                        <!-- Stock Capacity indicator -->
                        <div>
                          <div class="flex items-center justify-between text-[9px] text-slate-400 mb-1 font-medium">
                            <span>{{ item.current_p ? 'Current Stock' : 'Max Stock Capacity' }}</span>
                            <span class="font-mono text-slate-200">
                              {{ item.current_p ? `${item.stock} / ${item.maxStock}` : item.maxStock }}
                            </span>
                          </div>
                          <div class="h-1 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                            <div
                              class="h-full rounded-full transition-all duration-500"
                              :class="[
                                !item.current_p
                                  ? 'bg-slate-700'
                                  : (item.stock / item.maxStock) >= 0.5
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : (item.stock / item.maxStock) >= 0.2
                                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                      : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                              ]"
                              :style="{ width: (!item.current_p ? '100' : (item.stock / item.maxStock * 100)) + '%' }"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TransitionGroup>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
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

/* Crisp rendering for Minecraft pixel art icons */
.image-rendering-pixelated {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}

/* Premium Card Entering & Leaving Animations */
.card-list-enter-active,
.card-list-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-list-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-8px);
}
.card-list-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Subview Fade Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
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
