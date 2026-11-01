<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useTownyStore } from '../stores/townyStore.js';

const props = defineProps({
  apiBase: {
    type: String,
    required: true,
  },
  currencies: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['navigate']);

const route = useRoute();

// Stores
const townyStore = useTownyStore();
const { townyData } = storeToRefs(townyStore);

// Safe LocalStorage Loaders
const getSavedStorage = (key, defaultVal) => {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const val = localStorage.getItem(key);
    return val !== null && val !== undefined ? val : defaultVal;
  } catch {
    return defaultVal;
  }
};

const getSavedJson = (key, defaultVal) => {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
};

// Active Tool Selection: 'compare' (Town & Nation) or 'ccompare' (Currency)
const activeTool = ref(getSavedStorage('tools:activeTool', 'compare'));

// Target Palette colors for Multi-Entity comparison
const ENTITY_PALETTES = [
  {
    name: 'Blue',
    bg: 'bg-blue-600',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/10',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    bar: 'bg-blue-500',
    hex: '#3b82f6',
  },
  {
    name: 'Emerald',
    bg: 'bg-emerald-600',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/10',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    bar: 'bg-emerald-500',
    hex: '#10b981',
  },
  {
    name: 'Purple',
    bg: 'bg-purple-600',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/10',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    bar: 'bg-purple-500',
    hex: '#a855f7',
  },
  {
    name: 'Amber',
    bg: 'bg-amber-600',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    bar: 'bg-amber-500',
    hex: '#f59e0b',
  },
];

// -------------------------------------------------------------
// TOOL 1: TOWN & NATION COMPARATOR (/towny compare)
// -------------------------------------------------------------
const compareType = ref(getSavedStorage('tools:compareType', 'town')); // 'town' or 'nation'
const parsedCount = parseInt(getSavedStorage('tools:compareCount', '2'), 10);
const compareCount = ref(parsedCount >= 2 && parsedCount <= 4 ? parsedCount : 2); // 2, 3, or 4
const compareTarget1 = ref(getSavedStorage('tools:target1', ''));
const compareTarget2 = ref(getSavedStorage('tools:target2', ''));
const compareTarget3 = ref(getSavedStorage('tools:target3', ''));
const compareTarget4 = ref(getSavedStorage('tools:target4', ''));

// Towny datasets safely extracted
const allTowns = computed(() =>
  Array.isArray(townyData.value?.towns) ? townyData.value.towns : []
);
const allNations = computed(() =>
  Array.isArray(townyData.value?.nations) ? townyData.value.nations : []
);

// Dropdown search queries for picker
const activePickerSlot = ref(null);
const pickerSearchQuery = ref('');

function openEntityPicker(slotIndex) {
  activePickerSlot.value = slotIndex;
  pickerSearchQuery.value = '';
}

function closeEntityPicker() {
  activePickerSlot.value = null;
  pickerSearchQuery.value = '';
}

const filteredPickerList = computed(() => {
  const query = pickerSearchQuery.value.trim().toLowerCase();
  const list = compareType.value === 'town' ? allTowns.value : allNations.value;
  if (!query) return list.slice(0, 30);
  return list
    .filter(
      (item) =>
        (item.name || '').toLowerCase().includes(query) ||
        (item.name || '').replace(/_/g, ' ').toLowerCase().includes(query)
    )
    .slice(0, 30);
});

function selectPickerTarget(item) {
  if (!item || !item.name) return;
  if (activePickerSlot.value === 1) compareTarget1.value = item.name;
  else if (activePickerSlot.value === 2) compareTarget2.value = item.name;
  else if (activePickerSlot.value === 3) compareTarget3.value = item.name;
  else if (activePickerSlot.value === 4) compareTarget4.value = item.name;
  closeEntityPicker();
}

// Active targets array
const activeCompareTargets = computed(() => {
  const targets = [compareTarget1.value, compareTarget2.value];
  if (compareCount.value >= 3) targets.push(compareTarget3.value);
  if (compareCount.value >= 4) targets.push(compareTarget4.value);
  return targets;
});

// Resolved entity objects (Guaranteed non-null items with valid palette)
const resolvedCompareEntities = computed(() => {
  const dataset = compareType.value === 'town' ? allTowns.value : allNations.value;
  return activeCompareTargets.value.map((targetName, index) => {
    const palette = ENTITY_PALETTES[index % ENTITY_PALETTES.length];
    if (!targetName) {
      return {
        slot: index + 1,
        palette,
        name: '',
        entity: null,
      };
    }
    const cleanTarget = targetName.toLowerCase().replace(/_/g, ' ');
    const entity = dataset.find(
      (item) =>
        (item.name || '').toLowerCase() === targetName.toLowerCase() ||
        (item.name || '').toLowerCase().replace(/_/g, ' ') === cleanTarget
    );
    return {
      slot: index + 1,
      palette,
      name: targetName,
      entity: entity || null,
    };
  });
});

// Population & territory distribution calculations
const comparisonTotalPopulation = computed(() => {
  let total = 0;
  for (const item of resolvedCompareEntities.value) {
    if (item?.entity?.residents) total += Number(item.entity.residents);
  }
  return total > 0 ? total : 1;
});

const comparisonTotalTerritory = computed(() => {
  let total = 0;
  for (const item of resolvedCompareEntities.value) {
    if (compareType.value === 'town') {
      const chunks = item?.entity?.claims?.claimedChunks || 0;
      total += Number(chunks);
    } else {
      const towns = item?.entity?.towns || 0;
      total += Number(towns);
    }
  }
  return total > 0 ? total : 1;
});

// Safe set target count
function setCompareCount(count) {
  compareCount.value = count;
  const dataset = compareType.value === 'town' ? allTowns.value : allNations.value;
  if (!dataset || dataset.length === 0) return;
  if (count >= 3 && !compareTarget3.value && dataset[2]) {
    compareTarget3.value = dataset[2].name;
  }
  if (count >= 4 && !compareTarget4.value && dataset[3]) {
    compareTarget4.value = dataset[3].name;
  }
}

// Quick Presets
function applyComparePreset(presetType) {
  const dataset = compareType.value === 'town' ? allTowns.value : allNations.value;
  if (!dataset || dataset.length === 0) return;
  const sorted = [...dataset].sort((a, b) => (b.residents || 0) - (a.residents || 0));

  if (presetType === 'top2') {
    compareCount.value = 2;
    compareTarget1.value = sorted[0]?.name || '';
    compareTarget2.value = sorted[1]?.name || '';
    compareTarget3.value = '';
    compareTarget4.value = '';
  } else if (presetType === 'top4') {
    compareCount.value = 4;
    compareTarget1.value = sorted[0]?.name || '';
    compareTarget2.value = sorted[1]?.name || '';
    compareTarget3.value = sorted[2]?.name || '';
    compareTarget4.value = sorted[3]?.name || '';
  }
}

function swapCompareTargets(idxA, idxB) {
  const vals = [compareTarget1, compareTarget2, compareTarget3, compareTarget4];
  if (vals[idxA] && vals[idxB]) {
    const temp = vals[idxA].value;
    vals[idxA].value = vals[idxB].value;
    vals[idxB].value = temp;
  }
}

// -------------------------------------------------------------
// TOOL 2: MULTI-CURRENCY COMPARATOR (/ccompare)
// -------------------------------------------------------------
const savedCurrencies = getSavedJson('tools:selectedCurrencies', []);
const selectedCurrencies = ref(Array.isArray(savedCurrencies) ? savedCurrencies : []);
const availableCurrencies = computed(() => {
  return Array.isArray(props.currencies) ? props.currencies : [];
});

function toggleCurrencySelection(currId) {
  const idx = selectedCurrencies.value.indexOf(currId);
  if (idx > -1) {
    if (selectedCurrencies.value.length > 2) {
      selectedCurrencies.value.splice(idx, 1);
    }
  } else {
    if (selectedCurrencies.value.length < 5) {
      selectedCurrencies.value.push(currId);
    }
  }
}

const resolvedCurrencies = computed(() => {
  return selectedCurrencies.value
    .map((id) => availableCurrencies.value.find((c) => c.id === id))
    .filter(Boolean);
});

// Format 24h change percentage with maximum 3 decimals
function formatChange(val) {
  if (val === null || val === undefined) return '0%';
  const num = parseFloat(val);
  if (isNaN(num)) return '0%';
  const fixed = num.toFixed(3);
  const trimmed = parseFloat(fixed).toString();
  return num >= 0 ? `+${trimmed}%` : `${trimmed}%`;
}

// -------------------------------------------------------------
// LOCALSTORAGE PERSISTENCE WATCHERS
// -------------------------------------------------------------
watch(
  [
    activeTool,
    compareType,
    compareCount,
    compareTarget1,
    compareTarget2,
    compareTarget3,
    compareTarget4,
    selectedCurrencies,
  ],
  ([newTool, newType, newCount, t1, t2, t3, t4, newCurrs]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('tools:activeTool', newTool);
      localStorage.setItem('tools:compareType', newType);
      localStorage.setItem('tools:compareCount', String(newCount));
      localStorage.setItem('tools:target1', t1 || '');
      localStorage.setItem('tools:target2', t2 || '');
      localStorage.setItem('tools:target3', t3 || '');
      localStorage.setItem('tools:target4', t4 || '');
      localStorage.setItem('tools:selectedCurrencies', JSON.stringify(newCurrs || []));
    } catch {
      // ignore
    }
  },
  { deep: true }
);

// URL Query syncing (overrides localStorage if query is present)
function syncFromRoute() {
  if (route.query.tool) {
    activeTool.value = String(route.query.tool);
  }
  if (route.query.type) {
    compareType.value = route.query.type === 'nation' ? 'nation' : 'town';
  }
  if (route.query.target1) compareTarget1.value = String(route.query.target1);
  if (route.query.target2) compareTarget2.value = String(route.query.target2);
  if (route.query.target3) {
    compareTarget3.value = String(route.query.target3);
    compareCount.value = Math.max(compareCount.value, 3);
  }
  if (route.query.target4) {
    compareTarget4.value = String(route.query.target4);
    compareCount.value = 4;
  }
}

onMounted(() => {
  syncFromRoute();

  if (!townyData.value) {
    townyStore.fetchTownyData();
  }

  // If targets not set in localStorage, apply initial default preset
  if (!compareTarget1.value) {
    if (compareType.value === 'town' && allTowns.value.length >= 2) {
      applyComparePreset('top2');
    } else if (compareType.value === 'nation' && allNations.value.length >= 2) {
      applyComparePreset('top2');
    }
  }

  // If currencies not set in localStorage, load first 4
  if (selectedCurrencies.value.length === 0 && props.currencies && props.currencies.length >= 2) {
    selectedCurrencies.value = props.currencies.slice(0, 4).map((c) => c.id);
  }
});

watch(
  () => allTowns.value,
  (newTowns) => {
    if (newTowns && newTowns.length >= 2 && !compareTarget1.value && compareType.value === 'town') {
      applyComparePreset('top2');
    }
  },
  { immediate: true }
);

watch(
  () => allNations.value,
  (newNations) => {
    if (
      newNations &&
      newNations.length >= 2 &&
      !compareTarget1.value &&
      compareType.value === 'nation'
    ) {
      applyComparePreset('top2');
    }
  },
  { immediate: true }
);

watch(
  () => props.currencies,
  (newCurrs) => {
    if (newCurrs && newCurrs.length >= 2 && selectedCurrencies.value.length === 0) {
      selectedCurrencies.value = newCurrs.slice(0, 4).map((c) => c.id);
    }
  },
  { immediate: true }
);

// Safe formatters
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

function cleanName(str) {
  if (!str) return 'Unknown';
  return String(str).replace(/_/g, ' ');
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Hero Section -->
    <div
      class="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0c0e17] p-6 shadow-2xl backdrop-blur-md md:p-8"
    >
      <div
        class="absolute -top-24 -right-24 size-96 rounded-full bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 blur-3xl"
      />
      <div
        class="absolute -bottom-24 -left-24 size-80 rounded-full bg-gradient-to-tr from-emerald-600/10 to-cyan-600/10 blur-3xl"
      />

      <div class="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <!-- Clean Badge -->
          <div class="mb-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400"
            >
              <font-awesome-icon icon="wrench" class="text-[9px]" />
              Tools
            </span>
          </div>
          <h2
            class="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl"
          >
            ArcadiaMC Tools & Analytics
          </h2>
          <p class="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400 md:text-sm">
            Interactive side utilities and Discord bot telemetry tools including multi-entity Town &
            Nation comparisons and cross-currency exchange matrices.
          </p>
        </div>

        <!-- Quick Status Metrics (No Text Overflow Responsive Grid) -->
        <div class="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2.5">
          <div
            class="flex flex-col justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-center sm:px-3.5 sm:text-left"
          >
            <span
              class="text-[10px] font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase"
            >
              Towns
            </span>
            <span class="font-mono text-sm font-black text-white sm:text-base">
              {{ allTowns.length }}
            </span>
          </div>
          <div
            class="flex flex-col justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-center sm:px-3.5 sm:text-left"
          >
            <span
              class="text-[10px] font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase"
            >
              Nations
            </span>
            <span class="font-mono text-sm font-black text-white sm:text-base">
              {{ allNations.length }}
            </span>
          </div>
          <div
            class="flex flex-col justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-center sm:px-3.5 sm:text-left"
          >
            <span
              class="text-[10px] font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase"
            >
              Currencies
            </span>
            <span class="font-mono text-sm font-black text-white sm:text-base">
              {{ availableCurrencies.length }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs Pill Bar (Responsive & Protected from Text/Box Overflow) -->
      <div class="relative z-10 mt-6 border-t border-slate-800/80 pt-4">
        <div
          class="flex max-w-full flex-col flex-wrap items-stretch gap-2 sm:flex-row sm:items-center sm:gap-2.5"
        >
          <button
            :class="
              activeTool === 'compare'
                ? 'border-blue-500/60 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-white shadow-lg shadow-blue-500/20'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            "
            class="hover:scale-1.02 flex max-w-full min-w-0 cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 sm:justify-start"
            @click="activeTool = 'compare'"
          >
            <div class="flex min-w-0 items-center gap-2">
              <font-awesome-icon icon="code-compare" class="shrink-0 text-blue-400" />
              <span class="truncate">Town & Nation Compare</span>
            </div>
            <span></span>
          </button>

          <button
            :class="
              activeTool === 'ccompare'
                ? 'border-indigo-500/60 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white shadow-lg shadow-indigo-500/20'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            "
            class="hover:scale-1.02 flex max-w-full min-w-0 cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 sm:justify-start"
            @click="activeTool = 'ccompare'"
          >
            <div class="flex min-w-0 items-center gap-2">
              <font-awesome-icon icon="coins" class="shrink-0 text-indigo-400" />
              <span class="truncate">Currency Compare</span>
            </div>
            <span></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Sub-View Animated Container -->
    <Transition name="card-switch" mode="out-in" appear>
      <!-- ============================================================= -->
      <!-- TOOL 1: TOWN & NATION COMPARATOR -->
      <!-- ============================================================= -->
      <div v-if="activeTool === 'compare'" key="tool-compare" class="space-y-6">
        <!-- Compare Control Bar -->
        <div
          class="flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-[#0c0e17] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <!-- Type Switcher (Towns vs Nations) -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-slate-400">Target Type:</span>
            <div class="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                :class="
                  compareType === 'town'
                    ? 'bg-blue-600 font-bold text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                "
                class="rounded-md px-3 py-1 text-xs transition-colors"
                @click="
                  compareType = 'town';
                  applyComparePreset('top2');
                "
              >
                <font-awesome-icon icon="globe" class="mr-1" />
                Towns
              </button>
              <button
                :class="
                  compareType === 'nation'
                    ? 'bg-blue-600 font-bold text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                "
                class="rounded-md px-3 py-1 text-xs transition-colors"
                @click="
                  compareType = 'nation';
                  applyComparePreset('top2');
                "
              >
                <font-awesome-icon icon="flag" class="mr-1" />
                Nations
              </button>
            </div>

            <!-- Target Entity Count (2, 3, 4) -->
            <div
              class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1"
            >
              <button
                :class="
                  compareCount === 2
                    ? 'bg-slate-800 font-bold text-white'
                    : 'text-slate-400 hover:text-white'
                "
                class="rounded px-2.5 py-1 text-xs transition-colors"
                @click="setCompareCount(2)"
              >
                2 Targets
              </button>
              <button
                :class="
                  compareCount === 3
                    ? 'bg-slate-800 font-bold text-white'
                    : 'text-slate-400 hover:text-white'
                "
                class="rounded px-2.5 py-1 text-xs transition-colors"
                @click="setCompareCount(3)"
              >
                3 Targets
              </button>
              <button
                :class="
                  compareCount === 4
                    ? 'bg-slate-800 font-bold text-white'
                    : 'text-slate-400 hover:text-white'
                "
                class="rounded px-2.5 py-1 text-xs transition-colors"
                @click="setCompareCount(4)"
              >
                4 Targets
              </button>
            </div>
          </div>

          <!-- Preset Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              class="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 active:scale-95"
              @click="applyComparePreset('top2')"
            >
              🏆 Top 2
            </button>
            <button
              class="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 active:scale-95"
              @click="applyComparePreset('top4')"
            >
              👑 Top 4
            </button>
            <button
              class="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 active:scale-95"
              @click="swapCompareTargets(0, 1)"
            >
              <font-awesome-icon icon="rotate" class="mr-1" />
              Swap #1 & #2
            </button>
          </div>
        </div>

        <!-- Entity Selection Slots (Removed Redundant 'Change' Button) -->
        <div
          class="grid gap-3"
          :class="{
            'grid-cols-1 sm:grid-cols-2': compareCount === 2,
            'grid-cols-1 sm:grid-cols-3': compareCount === 3,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': compareCount === 4,
          }"
        >
          <div
            v-for="(slotItem, sIdx) in resolvedCompareEntities"
            :key="'slot_' + slotItem.slot"
            :style="{ '--card-idx': sIdx }"
            class="group relative rounded-xl border border-slate-800 bg-[#0e111c] p-3 shadow-md transition-all duration-200 hover:border-slate-700"
          >
            <div class="mb-2 flex items-center justify-between">
              <span
                :class="slotItem.palette.badge"
                class="rounded border px-2 py-0.5 text-[10px] font-bold"
              >
                Target #{{ slotItem.slot }}
              </span>
            </div>

            <button
              class="flex w-full min-w-0 items-center justify-between rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-left transition-colors hover:border-blue-500/50 active:scale-98"
              @click="openEntityPicker(slotItem.slot)"
            >
              <div class="min-w-0 truncate text-xs font-bold text-white">
                {{ slotItem.name ? cleanName(slotItem.name) : 'Select Target...' }}
              </div>
              <font-awesome-icon
                icon="chevron-down"
                class="ml-2 shrink-0 text-[10px] text-slate-400"
              />
            </button>
          </div>
        </div>

        <!-- Animated Comparison Body (Smooth Appear & Fade between Towns and Nations) -->
        <Transition name="card-switch" mode="out-in" appear>
          <div :key="'body_' + compareType + '_' + compareCount" class="space-y-6">
            <!-- Multi-Target Comparison Cards Grid with Staggered Pop Transitions -->
            <TransitionGroup
              tag="div"
              name="card-pop"
              appear
              class="grid gap-4"
              :class="{
                'grid-cols-1 md:grid-cols-2': compareCount === 2,
                'grid-cols-1 md:grid-cols-3': compareCount === 3,
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': compareCount === 4,
              }"
            >
              <div
                v-for="(item, cIdx) in resolvedCompareEntities"
                :key="
                  'card_' + compareType + '_' + item.slot + '_' + (item.entity?.name || 'empty')
                "
                :style="{ '--card-idx': cIdx }"
                :class="[item.palette.border, item.palette.glow]"
                class="hover:scale-1.02 relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-[#0b0d16] p-5 shadow-xl transition-all duration-300"
              >
                <!-- Top Accent Bar -->
                <div :class="item.palette.bar" class="absolute top-0 right-0 left-0 h-1" />

                <!-- Card Header: Rank Badge, Title, Leader -->
                <div>
                  <div class="mb-3 flex items-center justify-between">
                    <span
                      :class="item.palette.badge"
                      class="rounded-md border px-2.5 py-0.5 text-[11px] font-black uppercase"
                    >
                      Target #{{ item.slot }}
                    </span>
                    <span
                      v-if="item.entity"
                      class="rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-400"
                    >
                      {{ compareType === 'town' ? 'Town' : 'Nation' }}
                    </span>
                  </div>

                  <div v-if="item.entity">
                    <!-- Name & Leader Avatar -->
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="relative size-12 shrink-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950 shadow-inner"
                      >
                        <img
                          :src="`${props.apiBase}/heads/${(compareType === 'town' ? item.entity.mayor?.name : item.entity.king?.name) || 'Steve'}.png`"
                          :alt="item.entity.name"
                          class="size-full object-cover"
                          @error="
                            $event.target.src =
                              'https://mc-heads.net/avatar/' +
                              ((compareType === 'town'
                                ? item.entity.mayor?.name
                                : item.entity.king?.name) || 'Steve')
                          "
                        />
                      </div>
                      <div class="min-w-0 flex-1">
                        <h3
                          class="truncate text-lg font-black text-white"
                          :title="cleanName(item.entity.name)"
                        >
                          {{ cleanName(item.entity.name) }}
                        </h3>
                        <div class="truncate text-xs text-slate-400">
                          <span class="font-medium text-slate-500">
                            {{ compareType === 'town' ? 'Mayor:' : 'Leader:' }}
                          </span>
                          {{
                            (compareType === 'town'
                              ? item.entity.mayor?.name
                              : item.entity.king?.name) || 'None'
                          }}
                        </div>
                      </div>
                    </div>

                    <!-- Main Key Telemetry -->
                    <div class="mt-4 grid grid-cols-2 gap-2.5">
                      <!-- Population -->
                      <div
                        class="min-w-0 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/50 p-3"
                      >
                        <div class="truncate text-[10px] font-medium text-slate-400">Residents</div>
                        <div class="mt-0.5 truncate text-base font-black text-white">
                          {{ formatNumber(item.entity.residents || 0) }}
                        </div>
                        <div class="mt-1 truncate text-[10px] font-semibold text-blue-400">
                          {{
                            (
                              ((item.entity.residents || 0) / comparisonTotalPopulation) *
                              100
                            ).toFixed(1)
                          }}% share
                        </div>
                      </div>

                      <!-- Chunks or Member Towns -->
                      <div
                        class="min-w-0 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/50 p-3"
                      >
                        <div class="truncate text-[10px] font-medium text-slate-400">
                          {{ compareType === 'town' ? 'Chunks' : 'Towns' }}
                        </div>
                        <div class="mt-0.5 truncate text-base font-black text-white">
                          {{
                            compareType === 'town'
                              ? formatNumber(item.entity.claims?.claimedChunks || 0)
                              : formatNumber(item.entity.towns || 0)
                          }}
                        </div>
                        <div class="mt-1 truncate text-[10px] font-semibold text-emerald-400">
                          {{
                            (
                              (((compareType === 'town'
                                ? item.entity.claims?.claimedChunks
                                : item.entity.towns) || 0) /
                                comparisonTotalTerritory) *
                              100
                            ).toFixed(1)
                          }}% share
                        </div>
                      </div>
                    </div>

                    <!-- Additional Specs (Compact labels & truncate values to prevent card overflow) -->
                    <div
                      class="mt-3 space-y-1.5 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 text-xs"
                    >
                      <!-- Affiliation or Capital -->
                      <div class="flex items-center justify-between gap-2 text-slate-300">
                        <span class="shrink-0 text-slate-500">
                          {{ compareType === 'town' ? 'Nation:' : 'Capital:' }}
                        </span>
                        <span
                          class="min-w-0 truncate text-right font-semibold text-white"
                          :title="
                            (compareType === 'town'
                              ? item.entity.nation?.name
                              : item.entity.capital?.name) || 'None'
                          "
                        >
                          {{
                            (compareType === 'town'
                              ? item.entity.nation?.name
                              : item.entity.capital?.name) || 'None'
                          }}
                        </span>
                      </div>

                      <!-- Chunks Utilization or Allies -->
                      <div
                        v-if="compareType === 'town'"
                        class="flex items-center justify-between gap-2 text-slate-300"
                      >
                        <span class="shrink-0 text-slate-500">Claims:</span>
                        <span class="min-w-0 truncate text-right font-semibold text-white">
                          {{ formatNumber(item.entity.claims?.claimedChunks || 0) }} /
                          {{
                            item.entity.claims?.maxChunks
                              ? formatNumber(item.entity.claims.maxChunks)
                              : '∞'
                          }}
                          <span class="text-[10px] text-slate-400">
                            ({{
                              item.entity.claims?.maxChunks
                                ? Math.round(
                                    (item.entity.claims.claimedChunks /
                                      item.entity.claims.maxChunks) *
                                      100
                                  ) + '%'
                                : 'N/A'
                            }})
                          </span>
                        </span>
                      </div>

                      <div v-else class="flex items-center justify-between gap-2 text-slate-300">
                        <span class="shrink-0 text-slate-500">Allies:</span>
                        <span class="min-w-0 truncate text-right font-semibold text-emerald-400">
                          {{ formatNumber(item.entity.diplomacy?.alliesCount || 0) }} allies
                        </span>
                      </div>

                      <!-- PVP Indicator -->
                      <div class="flex items-center justify-between gap-2 text-slate-300">
                        <span class="shrink-0 text-slate-500">Security:</span>
                        <span
                          v-if="item.entity.status?.pvp"
                          class="inline-flex shrink-0 items-center gap-1 font-bold text-rose-400"
                        >
                          <span class="size-1.5 rounded-full bg-rose-500" />
                          PVP On
                        </span>
                        <span
                          v-else
                          class="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-400"
                        >
                          <span class="size-1.5 rounded-full bg-emerald-400" />
                          Peaceful
                        </span>
                      </div>

                      <!-- Open Status -->
                      <div
                        v-if="compareType === 'town'"
                        class="flex items-center justify-between gap-2 text-slate-300"
                      >
                        <span class="shrink-0 text-slate-500">Policy:</span>
                        <span class="min-w-0 truncate text-right font-semibold text-white">
                          {{ item.entity.status?.isOpen ? '🔓 Open' : '🔒 Invite Only' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Empty State for Unselected Target -->
                  <div v-else class="py-12 text-center">
                    <font-awesome-icon icon="circle-info" class="mb-2 text-2xl text-slate-600" />
                    <div class="text-xs font-semibold text-slate-400">No Target Selected</div>
                    <button
                      class="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-500 active:scale-95"
                      @click="openEntityPicker(item.slot)"
                    >
                      Choose {{ compareType === 'town' ? 'Town' : 'Nation' }}
                    </button>
                  </div>
                </div>

                <!-- Card Footer Action -->
                <div v-if="item.entity" class="mt-4 border-t border-slate-800/80 pt-3">
                  <button
                    class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-slate-800 hover:text-white active:scale-95"
                    @click="
                      emit('navigate', `/towny?tab=${compareType}s&search=${item.entity.name}`)
                    "
                  >
                    <span>View Full Profile</span>
                    <font-awesome-icon icon="arrow-right" class="text-[10px]" />
                  </button>
                </div>
              </div>
            </TransitionGroup>

            <!-- Comparative Distribution Bars -->
            <div class="space-y-4 rounded-2xl border border-slate-800 bg-[#0c0e17] p-5 shadow-xl">
              <h3 class="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
                <font-awesome-icon icon="chart-pie" class="text-blue-400" />
                Comparative Telemetry Distribution
              </h3>

              <!-- Population Distribution Bar -->
              <div>
                <div class="mb-1.5 flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-400">Population Distribution</span>
                  <span class="font-mono text-slate-500"
                    >Total: {{ formatNumber(comparisonTotalPopulation) }} residents</span
                  >
                </div>
                <div class="flex h-5 w-full overflow-hidden rounded-lg bg-slate-950 p-0.5">
                  <div
                    v-for="item in resolvedCompareEntities"
                    :key="'pop_' + item.slot"
                    :style="{
                      width: `${(((item.entity?.residents || 0) / comparisonTotalPopulation) * 100).toFixed(2)}%`,
                    }"
                    :class="item.palette.bar"
                    class="h-full transition-all duration-500 first:rounded-l-md last:rounded-r-md"
                    :title="`${cleanName(item.name)}: ${formatNumber(item.entity?.residents || 0)} residents`"
                  />
                </div>
                <!-- Legend under Bar -->
                <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <div
                    v-for="item in resolvedCompareEntities"
                    :key="'pop_leg_' + item.slot"
                    class="flex max-w-full min-w-0 items-center gap-1.5"
                  >
                    <span :class="item.palette.bar" class="size-2.5 shrink-0 rounded-full" />
                    <span
                      class="inline-block max-w-[130px] truncate font-semibold text-white"
                      :title="cleanName(item.name)"
                    >
                      {{ cleanName(item.name) }}:
                    </span>
                    <span class="shrink-0 text-slate-400">
                      {{ formatNumber(item.entity?.residents || 0) }}
                      ({{
                        (((item.entity?.residents || 0) / comparisonTotalPopulation) * 100).toFixed(
                          1
                        )
                      }}%)
                    </span>
                  </div>
                </div>
              </div>

              <!-- Territory / Town Count Distribution Bar -->
              <div class="border-t border-slate-800/80 pt-3">
                <div class="mb-1.5 flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-400">
                    {{
                      compareType === 'town'
                        ? 'Territory Chunks Distribution'
                        : 'Member Towns Distribution'
                    }}
                  </span>
                  <span class="font-mono text-slate-500">
                    Total: {{ formatNumber(comparisonTotalTerritory) }}
                    {{ compareType === 'town' ? 'chunks' : 'towns' }}
                  </span>
                </div>
                <div class="flex h-5 w-full overflow-hidden rounded-lg bg-slate-950 p-0.5">
                  <div
                    v-for="item in resolvedCompareEntities"
                    :key="'terr_' + item.slot"
                    :style="{
                      width: `${(
                        (((compareType === 'town'
                          ? item.entity?.claims?.claimedChunks
                          : item.entity?.towns) || 0) /
                          comparisonTotalTerritory) *
                        100
                      ).toFixed(2)}%`,
                    }"
                    :class="item.palette.bar"
                    class="h-full transition-all duration-500 first:rounded-l-md last:rounded-r-md"
                    :title="`${cleanName(item.name)}`"
                  />
                </div>
                <!-- Legend under Bar -->
                <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <div
                    v-for="item in resolvedCompareEntities"
                    :key="'terr_leg_' + item.slot"
                    class="flex max-w-full min-w-0 items-center gap-1.5"
                  >
                    <span :class="item.palette.bar" class="size-2.5 shrink-0 rounded-full" />
                    <span
                      class="inline-block max-w-[130px] truncate font-semibold text-white"
                      :title="cleanName(item.name)"
                    >
                      {{ cleanName(item.name) }}:
                    </span>
                    <span class="shrink-0 text-slate-400">
                      {{
                        formatNumber(
                          (compareType === 'town'
                            ? item.entity?.claims?.claimedChunks
                            : item.entity?.towns) || 0
                        )
                      }}
                      ({{
                        (
                          (((compareType === 'town'
                            ? item.entity?.claims?.claimedChunks
                            : item.entity?.towns) || 0) /
                            comparisonTotalTerritory) *
                          100
                        ).toFixed(1)
                      }}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ============================================================= -->
      <!-- TOOL 2: MULTI-CURRENCY COMPARATOR (/ccompare) -->
      <!-- ============================================================= -->
      <div v-else-if="activeTool === 'ccompare'" key="tool-ccompare" class="space-y-6">
        <div class="rounded-2xl border border-slate-800 bg-[#0c0e17] p-5 shadow-xl">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-base font-bold text-white">Compare National Currencies</h3>
                <span
                  class="inline-flex shrink-0 items-center rounded-md border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] leading-tight font-bold whitespace-nowrap text-indigo-300"
                >
                  /ccompare
                </span>
              </div>
              <p class="mt-1 text-xs text-slate-400">
                Select 2 to 5 currencies to compare live exchange rates, base backing, and
                cross-conversion rates.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400">Selected:</span>
              <span class="font-mono text-xs font-bold text-blue-400">
                {{ selectedCurrencies.length }} / 5
              </span>
            </div>
          </div>

          <!-- Currency Selector Chips -->
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="curr in availableCurrencies"
              :key="curr.id"
              :class="
                selectedCurrencies.includes(curr.id)
                  ? 'border-indigo-500 bg-indigo-600/30 text-white shadow-md'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              "
              class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
              @click="toggleCurrencySelection(curr.id)"
            >
              <span>{{ curr.name }}</span>
              <span class="font-mono text-[10px] text-slate-400"
                >({{ curr.id.toUpperCase() }})</span
              >
            </button>
          </div>
        </div>

        <!-- Currency Comparison Cards with Staggered Pop Transitions -->
        <TransitionGroup
          tag="div"
          name="card-pop"
          appear
          class="grid gap-4"
          :class="{
            'grid-cols-1 md:grid-cols-2': resolvedCurrencies.length === 2,
            'grid-cols-1 md:grid-cols-3': resolvedCurrencies.length === 3,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': resolvedCurrencies.length >= 4,
          }"
        >
          <div
            v-for="(curr, idx) in resolvedCurrencies"
            :key="curr.id"
            :style="{ '--card-idx': idx }"
            class="hover:scale-1.02 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0c0e17] p-5 shadow-xl transition-all duration-300 hover:border-indigo-500/40"
          >
            <div>
              <!-- Header -->
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-xs font-black text-indigo-300"
                >
                  {{ curr.id.toUpperCase() }}
                </span>
                <span
                  :class="parseFloat(curr.change24h) >= 0 ? 'text-emerald-400' : 'text-rose-400'"
                  class="font-mono text-xs font-bold"
                >
                  {{ formatChange(curr.change24h) }}
                </span>
              </div>

              <h4 class="mt-2 truncate text-base font-black text-white" :title="curr.name">
                {{ curr.name }}
              </h4>
              <div class="truncate text-xs text-slate-400" :title="curr.nation || 'Independent'">
                <span class="text-slate-500">Nation:</span> {{ curr.nation || 'Independent' }}
              </div>

              <!-- Live Rate Card -->
              <div class="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
                <div class="truncate text-[10px] font-medium text-slate-400">
                  Live Exchange Rate
                </div>
                <div class="mt-0.5 flex flex-wrap items-baseline gap-1">
                  <span class="truncate font-mono text-xl font-black text-white"
                    >₳ {{ curr.liveRate }}</span
                  >
                  <span class="shrink-0 text-xs font-normal text-slate-400">ARC / unit</span>
                </div>
                <div class="mt-1 truncate text-[10px] text-slate-500">
                  Base Rate: ₳ {{ curr.baseRate }}
                </div>
              </div>

              <!-- Stats List (Cleaned & text-overflow guarded) -->
              <div
                class="mt-3 space-y-1.5 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 text-xs"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="shrink-0 text-slate-500">Backing:</span>
                  <span
                    class="min-w-0 truncate text-right font-semibold text-slate-200"
                    :title="curr.standardItem ? curr.standardItem.replace(/_/g, ' ') : 'Gold Ingot'"
                  >
                    {{ curr.standardItem ? curr.standardItem.replace(/_/g, ' ') : 'Gold Ingot' }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="shrink-0 text-slate-500">24h Trend:</span>
                  <span
                    :class="parseFloat(curr.change24h) >= 0 ? 'text-emerald-400' : 'text-rose-400'"
                    class="shrink-0 font-mono font-semibold"
                  >
                    {{ formatChange(curr.change24h) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Action -->
            <div class="mt-4 border-t border-slate-800/80 pt-3">
              <button
                class="w-full rounded-lg bg-indigo-600/20 py-1.5 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-600 hover:text-white active:scale-95"
                @click="emit('navigate', `/exchange?from=${curr.id}&to=arc`)"
              >
                Open in Exchange
              </button>
            </div>
          </div>
        </TransitionGroup>

        <!-- Cross-Currency Direct Conversion Matrix -->
        <div
          v-if="resolvedCurrencies.length >= 2"
          class="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c0e17] p-5 shadow-xl"
        >
          <h3 class="mb-3 text-sm font-bold text-white">Direct Cross-Currency Exchange Matrix</h3>
          <p class="mb-4 text-xs text-slate-400">
            Shows how much 1 unit of the currency in the left column will yield in each of the
            selected currencies.
          </p>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead
                class="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase"
              >
                <tr>
                  <th class="p-3 whitespace-nowrap">1 Unit of</th>
                  <th
                    v-for="c in resolvedCurrencies"
                    :key="'col_' + c.id"
                    class="p-3 whitespace-nowrap"
                  >
                    {{ c.name }} ({{ c.id.toUpperCase() }})
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/50">
                <tr
                  v-for="fromC in resolvedCurrencies"
                  :key="'row_' + fromC.id"
                  class="hover:bg-slate-900/30"
                >
                  <td class="p-3 font-bold whitespace-nowrap text-white">
                    {{ fromC.name }} ({{ fromC.id.toUpperCase() }})
                  </td>
                  <td
                    v-for="toC in resolvedCurrencies"
                    :key="'val_' + fromC.id + '_' + toC.id"
                    class="p-3 font-mono whitespace-nowrap"
                    :class="fromC.id === toC.id ? 'text-slate-600' : 'text-slate-200'"
                  >
                    <span v-if="fromC.id === toC.id">1.0000</span>
                    <span v-else>
                      {{
                        (parseFloat(fromC.liveRate || 1) / parseFloat(toC.liveRate || 1)).toFixed(4)
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============================================================= -->
    <!-- ENTITY PICKER MODAL -->
    <!-- ============================================================= -->
    <Transition name="modal-fade-box">
      <div
        v-if="activePickerSlot !== null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        @click.self="closeEntityPicker"
      >
        <div
          class="modal-box-anim flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0e111c] shadow-2xl"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h3 class="text-sm font-bold text-white">
                Select {{ compareType === 'town' ? 'Town' : 'Nation' }} for Target #{{
                  activePickerSlot
                }}
              </h3>
              <p class="text-[11px] text-slate-400">
                Choose from active {{ compareType === 'town' ? 'towns' : 'nations' }} on ArcadiaMC.
              </p>
            </div>
            <button class="text-slate-400 hover:text-white" @click="closeEntityPicker">
              <font-awesome-icon icon="times" />
            </button>
          </div>

          <!-- Search Input -->
          <div class="border-b border-slate-800/80 p-3">
            <div class="relative">
              <input
                v-model="pickerSearchQuery"
                type="text"
                autofocus
                :placeholder="`Search ${compareType === 'town' ? 'towns' : 'nations'} by name...`"
                class="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 pl-9 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
              />
              <font-awesome-icon
                icon="search"
                class="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-500"
              />
            </div>
          </div>

          <!-- Entity Results List -->
          <div class="custom-scrollbar max-h-96 overflow-y-auto p-2">
            <div
              v-if="filteredPickerList.length === 0"
              class="py-8 text-center text-xs text-slate-500"
            >
              No matches found for "{{ pickerSearchQuery }}"
            </div>

            <button
              v-for="item in filteredPickerList"
              :key="item.name"
              class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-900 active:scale-98"
              @click="selectPickerTarget(item)"
            >
              <div class="flex min-w-0 items-center gap-2.5">
                <div
                  class="size-8 shrink-0 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-950"
                >
                  <img
                    :src="`${props.apiBase}/heads/${(compareType === 'town' ? item.mayor?.name : item.king?.name) || 'Steve'}.png`"
                    :alt="item.name"
                    class="size-full object-cover"
                    @error="
                      $event.target.src =
                        'https://mc-heads.net/avatar/' +
                        ((compareType === 'town' ? item.mayor?.name : item.king?.name) || 'Steve')
                    "
                  />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-xs font-bold text-white" :title="cleanName(item.name)">
                    {{ cleanName(item.name) }}
                  </div>
                  <div class="truncate text-[10px] text-slate-400">
                    {{
                      compareType === 'town'
                        ? `Mayor: ${item.mayor?.name || 'None'}`
                        : `Leader: ${item.king?.name || 'None'}`
                    }}
                  </div>
                </div>
              </div>

              <div class="shrink-0 text-right">
                <div class="font-mono text-xs font-bold text-blue-400">
                  {{ formatNumber(item.residents || 0) }} residents
                </div>
                <div class="text-[10px] text-slate-500">
                  {{
                    compareType === 'town'
                      ? `${formatNumber(item.claims?.claimedChunks || 0)} chunks`
                      : `${formatNumber(item.towns || 0)} towns`
                  }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
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

/* Subview & Type Switch Transitions */
.card-switch-enter-active,
.card-switch-leave-active {
  transition:
    opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-switch-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.card-switch-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Staggered Card Pop Transitions */
.card-pop-enter-active,
.card-pop-leave-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-pop-enter-active {
  transition-delay: calc(var(--card-idx, 0) * 35ms);
}
.card-pop-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
.card-pop-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.card-pop-move {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Modal Fade Box Transitions */
.modal-fade-box-enter-active,
.modal-fade-box-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-fade-box-enter-from,
.modal-fade-box-leave-to {
  opacity: 0;
}

.modal-box-anim {
  animation: modalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
