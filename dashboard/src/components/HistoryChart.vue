<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { Line } from 'vue-chartjs';
import axios from 'axios';
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
  currencies: {
    type: Array,
    required: true,
  },
});

// Retrieve API URL from Vite environment variables (falls back to relative path '')
const API_BASE = import.meta.env.VITE_API_URL || '';

const selectedCurrencies = ref([]);
const daysLimit = ref(30);
const chartMode = ref('absolute'); // 'absolute' or 'relative'
const rawHistoryData = ref([]);
const isLoading = ref(false);
const searchQuery = ref('');

const filteredCurrencies = computed(() => {
  if (!searchQuery.value) return props.currencies;
  const q = searchQuery.value.toLowerCase();
  return props.currencies.filter(
    (c) => c.name?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q)
  );
});

onMounted(() => {
  if (props.currencies && props.currencies.length > 0) {
    selectedCurrencies.value = props.currencies.slice(0, 2).map((c) => c.id);
    fetchHistory();
  }
});

async function fetchHistory() {
  if (selectedCurrencies.value.length === 0) {
    rawHistoryData.value = [];
    return;
  }

  isLoading.value = true;
  try {
    const promises = selectedCurrencies.value.map((id) =>
      axios.get(`${API_BASE}/currencies/history?currencyId=${id}&days=${daysLimit.value}`)
    );
    const responses = await Promise.all(promises);
    const data = responses.map((res, index) => ({
      currencyId: selectedCurrencies.value[index],
      records: res.data,
    }));
    rawHistoryData.value = data;
  } catch (error) {
    console.error('Failed to fetch history data:', error);
  } finally {
    isLoading.value = false;
  }
}

watch(
  [selectedCurrencies, daysLimit],
  () => {
    fetchHistory();
  },
  { deep: true }
);

const chartLabels = computed(() => {
  if (rawHistoryData.value.length === 0) return [];
  const longestRecord = rawHistoryData.value.reduce(
    (acc, curr) => (curr.records.length > acc.records.length ? curr : acc),
    rawHistoryData.value[0]
  );

  if (!longestRecord || !longestRecord.records) return [];

  return longestRecord.records.map((r) => {
    const dateStr =
      typeof r.date === 'string'
        ? r.date.split('T')[0]
        : new Date(r.date).toISOString().split('T')[0];
    return dateStr;
  });
});

const colorPalette = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

const chartDatasets = computed(() => {
  if (rawHistoryData.value.length === 0) return [];

  return rawHistoryData.value.map((data, index) => {
    const meta = props.currencies.find((c) => c.id === data.currencyId);
    const name = meta ? meta.name : data.currencyId;
    const color = colorPalette[index % colorPalette.length];

    let rates = data.records.map((r) => parseFloat(r.arcPerUnitLive) || 0);

    if (chartMode.value === 'relative' && rates.length > 0) {
      const initialRate = rates[0] || 1;
      rates = rates.map((r) => (r / initialRate) * 100);
    }

    return {
      label: name,
      data: rates,
      borderColor: color,
      backgroundColor: color + '15',
      borderWidth: 3,
      pointRadius: 2,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: false,
    };
  });
});

const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: chartDatasets.value,
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#94a3b8',
        font: {
          family: 'Outfit',
          size: 13,
        },
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      font: {
        family: 'Inter',
      },
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) {
            label +=
              chartMode.value === 'absolute'
                ? `₳${context.parsed.y.toFixed(3)}`
                : `${context.parsed.y.toFixed(1)}%`;
          }
          return label;
        },
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
          size: 11,
        },
        maxTicksLimit: 10,
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
          size: 11,
        },
        callback: function (value) {
          return chartMode.value === 'absolute' ? `₳${value.toFixed(2)}` : `${value.toFixed(0)}%`;
        },
      },
    },
  },
}));
</script>

<template>
  <div
    class="bg-[#11131c] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md"
  >
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/50"
    >
      <div>
        <h2 class="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <font-awesome-icon icon="chart-line" class="text-blue-500" />
          Currencies History Data Graph
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Track currency values and overlay multiple currencies side-by-side
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-1 flex">
          <button
            @click="chartMode = 'absolute'"
            :class="
              chartMode === 'absolute'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            "
            class="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
          >
            Absolute
          </button>
          <button
            @click="chartMode = 'relative'"
            :class="
              chartMode === 'relative'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            "
            class="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
            title="Normalize comparison starting values to 100%"
          >
            Relative (%)
          </button>
        </div>

        <select
          v-model="daysLimit"
          class="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
        >
          <option :value="7">Last 7 Days</option>
          <option :value="15">Last 15 Days</option>
          <option :value="30">Last 30 Days</option>
          <option :value="90">Last 90 Days</option>
          <option :value="120">Last 120 Days</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div
        class="lg:col-span-1 border-r border-slate-800/50 pr-2 max-h-[350px] overflow-y-auto custom-scrollbar"
      >
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2"
          >Compare Currencies</span
        >

        <div class="relative mb-3">
          <font-awesome-icon
            icon="magnifying-glass"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search currencies..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div class="space-y-2">
          <div
            v-for="curr in filteredCurrencies"
            :key="curr.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-950 transition-colors duration-150 cursor-pointer"
            @click="
              selectedCurrencies.includes(curr.id)
                ? (selectedCurrencies = selectedCurrencies.filter((id) => id !== curr.id))
                : selectedCurrencies.push(curr.id)
            "
          >
            <input
              type="checkbox"
              :id="'check-' + curr.id"
              :value="curr.id"
              v-model="selectedCurrencies"
              @click.stop
              class="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
            <label
              :for="'check-' + curr.id"
              class="text-sm font-medium text-slate-300 cursor-pointer select-none truncate"
            >
              {{ curr.name }}
            </label>
          </div>
        </div>
      </div>

      <div class="lg:col-span-3 h-[320px] relative">
        <div
          v-if="isLoading"
          class="absolute inset-0 bg-[#11131c]/60 flex items-center justify-center z-10 rounded-xl backdrop-blur-xs"
        >
          <div class="flex flex-col items-center gap-3">
            <font-awesome-icon icon="rotate" spin class="text-3xl text-blue-500" />
            <span class="text-xs font-semibold text-slate-400">Loading historical data...</span>
          </div>
        </div>

        <div
          v-if="selectedCurrencies.length === 0"
          class="h-full border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6"
        >
          <font-awesome-icon icon="sliders" class="text-4xl text-slate-600 mb-3" />
          <h4 class="text-sm font-semibold text-slate-300">No Currencies Selected</h4>
          <p class="text-xs text-slate-500 mt-1 max-w-[280px]">
            Select one or more currencies on the left to display historical charts.
          </p>
        </div>

        <div v-else class="h-full w-full">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>
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
</style>
