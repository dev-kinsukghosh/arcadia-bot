<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  apiBase: {
    type: String,
    required: true,
  },
});

const shops = ref([]);
const isLoading = ref(true);
const fetchError = ref(null);
const searchQuery = ref('');
const itemSearchQuery = ref('');
const selectedCategory = ref('all'); // 'all', 'selling', 'buying'

// Selected shop details modal state
const selectedShop = ref(null);
const isModalOpen = ref(false);

async function fetchShops() {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const res = await axios.get(`${props.apiBase}/shops`);
    shops.value = Array.isArray(res.data.shops) ? res.data.shops : [];
  } catch (error) {
    console.error('Failed to fetch shops:', error);
    fetchError.value = 'Failed to fetch player shops. Is the backend server online?';
  } finally {
    isLoading.value = false;
  }
}

function openShopDetails(shop) {
  selectedShop.value = shop;
  isModalOpen.value = true;
}

function closeModal() {
  selectedShop.value = null;
  isModalOpen.value = false;
}

// Copy coordinates utility with fallback for insecure HTTP contexts
const copiedText = ref(null);
function copyCoordinates(x, z) {
  const text = `${x}, ${z}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copiedText.value = text;
        setTimeout(() => {
          copiedText.value = null;
        }, 2000);
      })
      .catch(() => {
        fallbackCopyText(text);
      });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    copiedText.value = text;
    setTimeout(() => {
      copiedText.value = null;
    }, 2000);
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(textArea);
}

// Filter and search logic
const filteredShops = computed(() => {
  let result = [...shops.value];

  // Filter by shop name search
  if (searchQuery.value.trim() !== '') {
    const term = searchQuery.value.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(term) || (s.owner && s.owner.toLowerCase().includes(term))
    );
  }

  // Filter by item listed search
  if (itemSearchQuery.value.trim() !== '') {
    const term = itemSearchQuery.value.toLowerCase().trim();
    result = result.filter((s) => {
      const hasSellMatch = s.sellListings?.some((l) => l.item?.toLowerCase().includes(term));
      const hasBuyMatch = s.buyListings?.some((l) => l.item?.toLowerCase().includes(term));
      return hasSellMatch || hasBuyMatch;
    });
  }

  // Filter by category type (has listings of that type)
  if (selectedCategory.value === 'selling') {
    result = result.filter((s) => s.sellListings && s.sellListings.length > 0);
  } else if (selectedCategory.value === 'buying') {
    result = result.filter((s) => s.buyListings && s.buyListings.length > 0);
  }

  return result;
});

// Helper to format item display name
function formatItemName(item) {
  if (!item) return 'Unknown';
  return item
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Helper to format currency price
function formatCurrency(val, currency = 'ARC') {
  const num = parseFloat(val);
  if (isNaN(num)) return '0';
  return `${num.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${currency.toUpperCase()}`;
}

onMounted(() => {
  fetchShops();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Block -->
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-xl font-bold tracking-tight text-white">🛒 Player Shops Directory</h2>
        <p class="text-xs text-slate-400">
          Search player shops, look up listings, and find town coords to trade in-game.
        </p>
      </div>
      <button
        @click="fetchShops"
        class="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0d0f17] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-all duration-150 hover:border-slate-700 hover:bg-slate-900"
      >
        <font-awesome-icon icon="rotate" :class="{ 'animate-spin': isLoading }" />
        Refresh Database
      </button>
    </div>

    <!-- Filters & Search Controls -->
    <div
      class="grid gap-4 rounded-2xl border border-slate-800/80 bg-[#11131c]/50 p-4 backdrop-blur-md md:grid-cols-3"
    >
      <!-- Search Shop Name -->
      <div class="relative">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
          <font-awesome-icon icon="search" class="text-xs" />
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search shop or owner name..."
          class="w-full rounded-xl border border-slate-800 bg-[#07080c] py-2.5 pr-4 pl-9 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-blue-500/50"
        />
      </div>

      <!-- Search Item Listed -->
      <div class="relative">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
          <font-awesome-icon icon="filter" class="text-xs" />
        </span>
        <input
          v-model="itemSearchQuery"
          type="text"
          placeholder="Search items (e.g. wheat, saddle)..."
          class="w-full rounded-xl border border-slate-800 bg-[#07080c] py-2.5 pr-4 pl-9 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-blue-500/50"
        />
      </div>

      <!-- Category Selector -->
      <div class="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#07080c] p-1">
        <button
          @click="selectedCategory = 'all'"
          :class="
            selectedCategory === 'all'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all duration-150"
        >
          All
        </button>
        <button
          @click="selectedCategory = 'selling'"
          :class="
            selectedCategory === 'selling'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all duration-150"
        >
          Selling
        </button>
        <button
          @click="selectedCategory = 'buying'"
          :class="
            selectedCategory === 'buying'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          "
          class="flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all duration-150"
        >
          Buying
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="fetchError"
      class="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-400 shadow-md"
    >
      <font-awesome-icon icon="circle-exclamation" class="mt-0.5 text-red-400" />
      <div>
        <h4 class="text-sm font-bold">API Fetch Failed</h4>
        <p class="mt-0.5 text-xs leading-relaxed text-red-400/90">{{ fetchError }}</p>
      </div>
    </div>

    <!-- Main Grid Cards -->
    <TransitionGroup
      v-else-if="filteredShops.length > 0"
      tag="div"
      name="card-pop"
      appear
      class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      <div
        v-for="(shop, idx) in filteredShops"
        :key="shop.name"
        :style="{ '--card-idx': idx }"
        @click="openShopDetails(shop)"
        class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/80 bg-[#11131c]/40 p-4 shadow-xl backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700/80 hover:bg-[#11131c]/60 cursor-pointer"
      >
        <div>
          <!-- Header -->
          <div class="flex items-start justify-between">
            <h3 class="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
              {{ shop.name.replace(/_/g, ' ') }}
            </h3>
            <span
              class="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase"
            >
              {{ shop.currency ? shop.currency : 'N/A' }}
            </span>
          </div>

          <!-- Owner Head & Username -->
          <div class="mt-2.5 flex items-center gap-2">
            <img
              :src="apiBase + '/heads/' + (shop.ownerName || shop.owner) + '.png'"
              alt=""
              class="h-5 w-5 rounded bg-slate-950 border border-slate-800"
              @error="
                (e) => {
                  e.target.src = apiBase + '/heads/steve.png';
                }
              "
            />
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-slate-300">{{
                shop.ownerName || 'Shop Owner'
              }}</span>
              <span class="font-mono text-[9px] text-slate-500">
                UUID: {{ shop.owner ? shop.owner.substring(0, 8) + '...' : 'Unknown' }}
              </span>
            </div>
          </div>

          <!-- Coordinates Coordinates -->
          <div class="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div class="flex items-center gap-1.5">
              <font-awesome-icon icon="globe" class="text-slate-500" />
              <span>X: {{ shop.plotX }} · Z: {{ shop.plotZ }}</span>
            </div>
            <button
              @click.stop="copyCoordinates(shop.plotX, shop.plotZ)"
              class="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 transition-all hover:bg-slate-800 hover:text-blue-400"
            >
              {{ copiedText === `${shop.plotX}, ${shop.plotZ}` ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <!-- Listings count -->
          <div
            class="mt-4 flex items-center gap-4 border-t border-slate-800/40 pt-3 text-[10px] text-slate-400"
          >
            <div>
              <span class="text-xs font-bold text-emerald-400">{{
                shop.sellListings?.length || 0
              }}</span>
              Selling
            </div>
            <div>
              <span class="text-xs font-bold text-blue-400">{{
                shop.buyListings?.length || 0
              }}</span>
              Buying
            </div>
          </div>
        </div>

        <!-- View Button indicator -->
        <div
          class="mt-4 flex items-center justify-end text-xs font-bold text-blue-500 group-hover:translate-x-0.5 transition-all"
        >
          Inspect listings &rarr;
        </div>
      </div>
    </TransitionGroup>

    <!-- Empty State -->
    <div
      v-else-if="!isLoading"
      class="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-800/80 bg-[#11131c]/20 py-24 text-center"
    >
      <font-awesome-icon icon="circle-info" class="text-4xl text-slate-600" />
      <div>
        <h4 class="text-sm font-semibold text-slate-300">No Shops Found</h4>
        <p class="mt-1 text-xs text-slate-500">
          No player shops matched your search filter or category choices.
        </p>
      </div>
    </div>

    <!-- Shop Details Modal -->
    <div
      v-if="isModalOpen && selectedShop"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-all"
      @click.self="closeModal"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0d0f17] shadow-2xl transition-all"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-slate-800 bg-[#11131c] px-6 py-4"
        >
          <div class="flex items-center gap-3">
            <img
              :src="apiBase + '/heads/' + (selectedShop.ownerName || selectedShop.owner) + '.png'"
              alt=""
              class="h-8 w-8 rounded bg-slate-950 border border-slate-800"
              @error="
                (e) => {
                  e.target.src = apiBase + '/heads/steve.png';
                }
              "
            />
            <div>
              <h3 class="text-base font-bold text-white leading-tight">
                🛒 Shop Details: {{ selectedShop.name.replace(/_/g, ' ') }}
              </h3>
              <p class="text-[10px] font-medium text-slate-400">
                Owner:
                <span class="font-bold text-slate-300">{{
                  selectedShop.ownerName || 'Shop Owner'
                }}</span>
                ·
                <span class="font-mono text-slate-500"
                  >UUID: {{ selectedShop.owner || 'Unknown' }}</span
                >
              </p>
            </div>
          </div>
          <button
            @click="closeModal"
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
          >
            <font-awesome-icon icon="times" />
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="max-h-[500px] overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <!-- Metadata and Coordinates -->
          <div class="grid gap-4 sm:grid-cols-2">
            <!-- Coords Box -->
            <div class="rounded-xl border border-slate-800 bg-[#07080c] p-4">
              <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase"
                >Spawn Coordinate</span
              >
              <div class="mt-1 flex items-center justify-between">
                <span class="font-mono text-sm text-slate-200">
                  X: {{ selectedShop.plotX }} , Z: {{ selectedShop.plotZ }}
                </span>
                <button
                  @click="copyCoordinates(selectedShop.plotX, selectedShop.plotZ)"
                  class="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-blue-400 hover:bg-slate-750"
                >
                  {{
                    copiedText === `${selectedShop.plotX}, ${selectedShop.plotZ}`
                      ? 'Copied!'
                      : 'Copy Coords'
                  }}
                </button>
              </div>
              <p class="mt-1 text-[10px] text-slate-500">
                World: {{ selectedShop.world || 'currentarc' }}
              </p>
            </div>

            <!-- Currency box -->
            <div class="rounded-xl border border-slate-800 bg-[#07080c] p-4">
              <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase"
                >Primary Currency</span
              >
              <p class="mt-1 text-sm font-semibold text-slate-200 uppercase">
                {{ selectedShop.currency ? selectedShop.currency : 'Not configured' }}
              </p>
              <div class="mt-1.5 flex flex-wrap gap-1">
                <span
                  v-for="(bal, cur) in selectedShop.balances"
                  :key="cur"
                  class="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 uppercase"
                >
                  {{ cur }}: {{ parseFloat(bal).toFixed(1) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Listings split view -->
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Selling -->
            <div>
              <h4
                class="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2"
              >
                🛒 Selling Offers ({{ selectedShop.sellListings?.length || 0 }})
              </h4>
              <div class="mt-3 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                <div
                  v-for="(list, idx) in selectedShop.sellListings"
                  :key="idx"
                  class="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-950/40 p-2.5 text-xs"
                >
                  <div>
                    <p class="font-semibold text-slate-200">{{ formatItemName(list.item) }}</p>
                    <p class="text-[10px] text-slate-500">Stock: {{ list.amount }} units</p>
                  </div>
                  <div class="font-mono font-bold text-emerald-400">
                    {{ formatCurrency(list.price, list.currency || selectedShop.currency) }}
                  </div>
                </div>
                <p
                  v-if="!selectedShop.sellListings || selectedShop.sellListings.length === 0"
                  class="text-xs italic text-slate-600 py-4"
                >
                  No active items on sale.
                </p>
              </div>
            </div>

            <!-- Buying -->
            <div>
              <h4
                class="text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-2"
              >
                📥 Buying Requests ({{ selectedShop.buyListings?.length || 0 }})
              </h4>
              <div class="mt-3 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                <div
                  v-for="(list, idx) in selectedShop.buyListings"
                  :key="idx"
                  class="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-950/40 p-2.5 text-xs"
                >
                  <div>
                    <p class="font-semibold text-slate-200">{{ formatItemName(list.item) }}</p>
                    <p class="text-[10px] text-slate-500">Wants: {{ list.amount }} units</p>
                  </div>
                  <div class="font-mono font-bold text-blue-400">
                    {{ formatCurrency(list.price, list.currency || selectedShop.currency) }}
                  </div>
                </div>
                <p
                  v-if="!selectedShop.buyListings || selectedShop.buyListings.length === 0"
                  class="text-xs italic text-slate-600 py-4"
                >
                  No active buying requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end border-t border-slate-800 bg-[#11131c] px-6 py-3.5">
          <button
            @click="closeModal"
            class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
