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
    convoyItems.value = res.data.map((item) => ({
      ...item,
      imageError: false,
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Live stock items (active right now)
const liveItems = computed(() => {
  return convoyItems.value.filter((item) => item.current_p);
});

// Group Live items by rarity for distinct sections
const liveItemsByRarity = computed(() => {
  const groups = {
    Legendary: [],
    Epic: [],
    Rare: [],
    Uncommon: [],
    Common: [],
  };

  liveItems.value.forEach((item) => {
    const key = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1).toLowerCase();
    if (groups[key] !== undefined) {
      groups[key].push(item);
    } else {
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
  });

  return Object.keys(groups)
    .filter((r) => groups[r].length > 0)
    .reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {});
});

// Compute unique rarities tracked
const uniqueRarities = computed(() => {
  const rarities = convoyItems.value.map((item) => item.rarity);
  return ['all', ...new Set(rarities)];
});

// Filtered catalog list
const filteredItems = computed(() => {
  let list = [...convoyItems.value];

  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (item) =>
        item.item.toLowerCase().replace(/_/g, ' ').includes(q) ||
        item.rarity.toLowerCase().includes(q)
    );
  }

  // Rarity filter
  if (activeRarityFilter.value !== 'all') {
    list = list.filter((item) => item.rarity === activeRarityFilter.value);
  }

  return list;
});

// Group catalog items by rarity for sections
const catalogItemsByRarity = computed(() => {
  const groups = {
    Legendary: [],
    Epic: [],
    Rare: [],
    Uncommon: [],
    Common: [],
  };

  filteredItems.value.forEach((item) => {
    const key = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1).toLowerCase();
    if (groups[key] !== undefined) {
      groups[key].push(item);
    } else {
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
  });

  return Object.keys(groups)
    .filter((r) => groups[r].length > 0)
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
    <div
      class="flex flex-col justify-between gap-4 border-b border-slate-900 pb-4 sm:flex-row sm:items-center"
    >
      <div>
        <h2 class="flex items-center gap-2 text-base font-bold text-slate-100">
          <font-awesome-icon icon="cube" class="text-blue-500" />
          Convoy Shop Monitor
        </h2>
        <p class="mt-0.5 text-[11px] text-slate-400">
          Real-time active shop rotations and complete tracked item catalogs grouped by rarity tiers
        </p>
      </div>

      <button
        @click="fetchConvoyData"
        class="flex cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-150 hover:border-slate-700 hover:bg-slate-800 sm:self-auto"
      >
        <font-awesome-icon icon="rotate" :spin="isLoading" />
        Sync Stock
      </button>
    </div>

    <!-- Segmented Control View Selector -->
    <div class="flex max-w-[280px] rounded-xl border border-slate-900 bg-slate-950/85 p-1">
      <button
        @click="activeSubView = 'live'"
        :class="
          activeSubView === 'live'
            ? 'bg-slate-900 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        "
        class="flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center text-[10px] font-semibold tracking-wider uppercase transition-all duration-200"
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
        class="flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center text-[10px] font-semibold tracking-wider uppercase transition-all duration-200"
      >
        All Items
      </button>
    </div>

    <!-- Loading / Error states -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-24">
      <font-awesome-icon icon="rotate" spin class="mb-3 text-3xl text-blue-500" />
      <span class="text-xs font-semibold text-slate-400">Loading convoy database records...</span>
    </div>

    <div
      v-else-if="fetchError"
      class="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400"
    >
      <font-awesome-icon icon="triangle-exclamation" class="mb-2 text-2xl" />
      <h4 class="text-sm font-semibold">{{ fetchError }}</h4>
    </div>

    <!-- Active Sections -->
    <div v-else>
      <Transition name="card-switch" mode="out-in">
        <!-- ================= SECTION 1: LIVE SHOP TRADES ================= -->
        <div v-if="activeSubView === 'live'" key="view-live" class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-900/60 pb-2">
            <div class="flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <h3 class="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Live Shop Trades
              </h3>
            </div>
            <span
              class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 uppercase"
            >
              {{ liveItems.length }} active rotations
            </span>
          </div>

          <div
            v-if="liveItems.length === 0"
            class="rounded-2xl border border-slate-800/80 bg-[#11131c]/40 py-12 text-center text-xs text-slate-500"
          >
            <font-awesome-icon icon="circle-info" class="mb-1.5 text-xl text-slate-600" />
            <div>No items currently active in the shop rotation.</div>
          </div>

          <div v-else class="space-y-8">
            <div
              v-for="(items, rarity) in liveItemsByRarity"
              :key="'live-group-' + rarity"
              class="space-y-3"
            >
              <h4
                class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase"
                :class="getRarityTextClass(rarity)"
              >
                <span
                  class="h-1.5 w-1.5 animate-pulse rounded-full"
                  :class="getRarityDotBg(rarity)"
                ></span>
                {{ rarity }} Tier
              </h4>

              <TransitionGroup
                tag="div"
                name="card-pop"
                appear
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
              >
                <div
                  v-for="(item, idx) in items"
                  :key="'live-' + item.item"
                  :style="{ '--card-idx': idx }"
                  class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-slate-950/20 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1"
                  :class="getRarityClasses(item.rarity)"
                >
                  <!-- Card Rarity Badge -->
                  <div class="mb-3.5 flex items-center justify-between">
                    <span
                      class="rounded border bg-slate-950/60 px-2 py-0.5 text-[9px] font-bold tracking-wider capitalize uppercase"
                      :class="[
                        getRarityTextClass(item.rarity),
                        getRarityClasses(item.rarity).split(' ')[0],
                      ]"
                    >
                      {{ item.rarity.toLowerCase() }}
                    </span>
                    <span class="font-mono text-[9px] text-slate-500"
                      >Seen: {{ item.timesSeen }}x</span
                    >
                  </div>

                  <!-- Item Texture Area -->
                  <div
                    class="relative mb-4 flex min-h-[96px] items-center justify-center rounded-xl border border-slate-900/30 bg-slate-950/20 py-4"
                  >
                    <img
                      v-if="!item.imageError"
                      :src="props.apiBase + '/icons/' + item.item + '.png'"
                      @error="handleImageError(item)"
                      class="image-rendering-pixelated h-14 w-14 object-contain transition-transform duration-300 group-hover:scale-110"
                      :alt="item.item"
                    />
                    <div v-else class="flex flex-col items-center gap-1.5 text-slate-600">
                      <font-awesome-icon icon="cube" class="text-3xl text-slate-600" />
                      <span class="font-mono text-[8px] tracking-wider">NO TEXTURE</span>
                    </div>
                  </div>

                  <!-- Item Info -->
                  <div class="flex flex-1 flex-col justify-between space-y-3.5">
                    <div>
                      <h4
                        class="truncate text-xs font-bold tracking-tight text-slate-200 transition-colors duration-150 group-hover:text-blue-400"
                      >
                        {{ formatItemName(item.item) }}
                      </h4>
                      <p class="mt-0.5 truncate font-mono text-[8px] text-slate-600 uppercase">
                        ID: {{ item.item }}
                      </p>
                    </div>

                    <!-- Price Pills -->
                    <div class="grid grid-cols-2 gap-2 text-center">
                      <div class="rounded-lg border border-slate-900 bg-[#0b0c10] p-1">
                        <div class="text-[7px] font-bold tracking-wider text-slate-500 uppercase">
                          Buy
                        </div>
                        <div class="mt-0.5 font-mono text-[10px] font-bold text-emerald-400">
                          ₳{{ parseFloat(item.buyPrice).toFixed(2) }}
                        </div>
                      </div>
                      <div class="rounded-lg border border-slate-900 bg-[#0b0c10] p-1">
                        <div class="text-[7px] font-bold tracking-wider text-slate-500 uppercase">
                          Sell
                        </div>
                        <div class="mt-0.5 font-mono text-[10px] font-bold text-slate-300">
                          ₳{{ parseFloat(item.sellPrice).toFixed(2) }}
                        </div>
                      </div>
                    </div>

                    <!-- Stock Progress -->
                    <div>
                      <div
                        class="mb-1 flex items-center justify-between text-[9px] font-medium text-slate-400"
                      >
                        <span>Current Stock</span>
                        <span class="font-mono text-slate-200"
                          >{{ item.stock }} / {{ item.maxStock }}</span
                        >
                      </div>
                      <div
                        class="h-1 overflow-hidden rounded-full border border-slate-900 bg-slate-950"
                      >
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="[
                            item.stock / item.maxStock >= 0.5
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : item.stock / item.maxStock >= 0.2
                                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
                          ]"
                          :style="{ width: (item.stock / item.maxStock) * 100 + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </div>
          </div>
        </div>

        <!-- ================= SECTION 2: ALL REGISTERED ITEMS ================= -->
        <div v-else-if="activeSubView === 'all'" key="view-all" class="space-y-4">
          <div class="flex items-center gap-2 border-b border-slate-900/60 pb-2">
            <font-awesome-icon icon="globe" class="text-blue-500/80" />
            <h3 class="text-xs font-bold tracking-wider text-slate-200 uppercase">
              All Tracked Items
            </h3>
          </div>

          <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
            <!-- Filters & Search -->
            <div
              class="space-y-5 rounded-2xl border border-slate-800/80 bg-[#11131c] p-5 shadow-xl backdrop-blur-md lg:col-span-1"
            >
              <div class="flex items-center justify-between border-b border-slate-800/50 pb-3">
                <h4 class="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <font-awesome-icon icon="filter" class="text-slate-400" />
                  Catalog Filters
                </h4>
                <button
                  @click="
                    searchQuery = '';
                    activeRarityFilter = 'all';
                  "
                  class="cursor-pointer text-[9px] font-semibold tracking-wider text-slate-500 uppercase transition-colors duration-150 hover:text-slate-300"
                >
                  Reset
                </button>
              </div>

              <!-- Search input -->
              <div>
                <label
                  class="mb-2 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase"
                  >Search Catalog</label
                >
                <div class="relative">
                  <span
                    class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[10px] text-slate-500"
                  >
                    <font-awesome-icon icon="search" />
                  </span>
                  <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="Search item name..."
                    class="block w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pr-3 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <!-- Rarity Filters -->
              <div>
                <label
                  class="mb-2 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase"
                  >Rarity Tier</label
                >
                <div class="space-y-1">
                  <button
                    @click="activeRarityFilter = 'all'"
                    :class="
                      activeRarityFilter === 'all'
                        ? 'border-blue-500/30 bg-blue-600/15 text-blue-300'
                        : 'border-slate-800/60 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                    "
                    class="flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-all duration-150"
                  >
                    <span>All Rarities</span>
                    <span
                      class="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
                      >{{ convoyItems.length }}</span
                    >
                  </button>
                  <button
                    v-for="rarity in uniqueRarities.filter((r) => r !== 'all')"
                    :key="'filter-' + rarity"
                    @click="activeRarityFilter = rarity"
                    :class="
                      activeRarityFilter === rarity
                        ? 'border-blue-500/30 bg-blue-600/15 text-blue-300'
                        : 'border-slate-800/60 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                    "
                    class="flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs font-medium capitalize transition-all duration-150"
                  >
                    <span :class="getRarityTextClass(rarity)">{{ rarity.toLowerCase() }}</span>
                    <span
                      class="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
                    >
                      {{ convoyItems.filter((item) => item.rarity === rarity).length }}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Catalog Cards Grouped by Rarity Sections -->
            <div class="space-y-8 lg:col-span-3">
              <div
                class="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#11131c] p-4 shadow-lg backdrop-blur-md"
              >
                <div>
                  <div class="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Catalog Coverage
                  </div>
                  <div class="mt-0.5 text-xs font-bold text-slate-200">
                    Showing
                    <span class="font-mono text-blue-500">{{ filteredItems.length }}</span> of
                    <span class="font-mono text-slate-400">{{ convoyItems.length }}</span>
                    registered convoy items
                  </div>
                </div>
              </div>

              <div
                v-if="filteredItems.length === 0"
                class="rounded-2xl border border-slate-800/80 bg-[#11131c] px-4 py-16 text-center"
              >
                <font-awesome-icon icon="circle-info" class="mb-2 text-2xl text-slate-600" />
                <h4 class="text-xs font-semibold text-slate-300">No Matching Items Found</h4>
                <p class="mt-1 text-[11px] text-slate-500">Try clearing filters or search terms.</p>
              </div>

              <div v-else class="space-y-8">
                <div
                  v-for="(items, rarity) in catalogItemsByRarity"
                  :key="'catalog-group-' + rarity"
                  class="space-y-3"
                >
                  <h4
                    class="flex items-center gap-2 border-b border-slate-900 pb-1 text-xs font-bold tracking-wider uppercase"
                    :class="getRarityTextClass(rarity)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="getRarityDotBg(rarity)"></span>
                    {{ rarity }} Items
                    <span class="ml-1 font-mono text-[9px] font-normal text-slate-500"
                      >({{ items.length }})</span
                    >
                  </h4>

                  <TransitionGroup
                    name="card-pop"
                    tag="div"
                    appear
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
                  >
                    <div
                      v-for="(item, idx) in items"
                      :key="'all-' + item.item"
                      :style="{ '--card-idx': idx }"
                      class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 shadow-lg transition-all duration-300 hover:-translate-y-1"
                      :class="getRarityClasses(item.rarity)"
                    >
                      <!-- Card Rarity / Status Badge -->
                      <div class="mb-3 flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                          <span
                            class="rounded border bg-slate-950/60 px-1.5 py-0.5 text-[8px] font-bold tracking-wider capitalize uppercase"
                            :class="[
                              getRarityTextClass(item.rarity),
                              getRarityClasses(item.rarity).split(' ')[0],
                            ]"
                          >
                            {{ item.rarity.toLowerCase() }}
                          </span>
                          <span
                            :class="
                              item.current_p
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                                : 'border-slate-900 bg-slate-950/50 text-slate-500'
                            "
                            class="rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase"
                          >
                            {{ item.current_p ? 'Active' : 'Inactive' }}
                          </span>
                        </div>
                        <span class="font-mono text-[8px] text-slate-500"
                          >Seen: {{ item.timesSeen }}x</span
                        >
                      </div>

                      <!-- Item Texture Area -->
                      <div
                        class="relative mb-3 flex min-h-[84px] items-center justify-center rounded-xl border border-slate-900/30 bg-slate-950/20 py-3"
                      >
                        <img
                          v-if="!item.imageError"
                          :src="props.apiBase + '/icons/' + item.item + '.png'"
                          @error="handleImageError(item)"
                          class="image-rendering-pixelated h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-110"
                          :alt="item.item"
                        />
                        <div v-else class="flex flex-col items-center gap-1 text-slate-600">
                          <font-awesome-icon icon="cube" class="text-2xl text-slate-600" />
                          <span class="font-mono text-[8px] tracking-wider">NO TEXTURE</span>
                        </div>
                      </div>

                      <!-- Item Info -->
                      <div class="flex flex-1 flex-col justify-between space-y-3">
                        <div>
                          <h4
                            class="truncate text-xs font-bold tracking-tight text-slate-200 transition-colors duration-150 group-hover:text-blue-400"
                          >
                            {{ formatItemName(item.item) }}
                          </h4>
                          <p class="mt-0.5 truncate font-mono text-[8px] text-slate-600 uppercase">
                            ID: {{ item.item }}
                          </p>
                        </div>

                        <!-- Price Pills -->
                        <div class="grid grid-cols-2 gap-2 text-center">
                          <div class="rounded-lg border border-slate-900 bg-[#0b0c10] p-1">
                            <div
                              class="text-[7px] font-bold tracking-wider text-slate-500 uppercase"
                            >
                              Buy
                            </div>
                            <div class="mt-0.5 font-mono text-[10px] font-bold text-emerald-400">
                              ₳{{ parseFloat(item.buyPrice).toFixed(2) }}
                            </div>
                          </div>
                          <div class="rounded-lg border border-slate-900 bg-[#0b0c10] p-1">
                            <div
                              class="text-[7px] font-bold tracking-wider text-slate-500 uppercase"
                            >
                              Sell
                            </div>
                            <div class="mt-0.5 font-mono text-[10px] font-bold text-slate-300">
                              ₳{{ parseFloat(item.sellPrice).toFixed(2) }}
                            </div>
                          </div>
                        </div>

                        <!-- Stock Capacity indicator -->
                        <div>
                          <div
                            class="mb-1 flex items-center justify-between text-[9px] font-medium text-slate-400"
                          >
                            <span>{{
                              item.current_p ? 'Current Stock' : 'Max Stock Capacity'
                            }}</span>
                            <span class="font-mono text-slate-200">
                              {{
                                item.current_p ? `${item.stock} / ${item.maxStock}` : item.maxStock
                              }}
                            </span>
                          </div>
                          <div
                            class="h-1 overflow-hidden rounded-full border border-slate-900 bg-slate-950"
                          >
                            <div
                              class="h-full rounded-full transition-all duration-500"
                              :class="[
                                !item.current_p
                                  ? 'bg-slate-700'
                                  : item.stock / item.maxStock >= 0.5
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : item.stock / item.maxStock >= 0.2
                                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                      : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
                              ]"
                              :style="{
                                width:
                                  (!item.current_p ? '100' : (item.stock / item.maxStock) * 100) +
                                  '%',
                              }"
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
  transition:
    opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
