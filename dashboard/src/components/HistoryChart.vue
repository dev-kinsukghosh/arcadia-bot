<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
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

const savedSelected = localStorage.getItem('history:selected');
const selectedCurrencies = ref(savedSelected ? JSON.parse(savedSelected) : []);

const savedDays = localStorage.getItem('history:days');
const daysLimit = ref(savedDays ? parseInt(savedDays, 10) : 30);

const savedMode = localStorage.getItem('history:mode');
const chartMode = ref(savedMode || 'raw'); // 'raw' or 'percentage'

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
  if (selectedCurrencies.value.length === 0 && props.currencies && props.currencies.length > 0) {
    selectedCurrencies.value = props.currencies.slice(0, 2).map((c) => c.id);
  }
  fetchHistory();
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

function toggleSelection(id) {
  const index = selectedCurrencies.value.indexOf(id);
  if (index > -1) {
    selectedCurrencies.value = selectedCurrencies.value.filter((x) => x !== id);
  } else {
    selectedCurrencies.value = [...selectedCurrencies.value, id];
  }

  nextTick(() => {
    const el = document.getElementById('item-' + id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

watch(
  [selectedCurrencies, daysLimit, chartMode],
  ([newSelected, newDays, newMode]) => {
    localStorage.setItem('history:selected', JSON.stringify(newSelected));
    localStorage.setItem('history:days', String(newDays));
    localStorage.setItem('history:mode', newMode);
    fetchHistory();
  },
  { deep: true }
);

const chartLabels = computed(() => {
  const dates = [];
  const limit = daysLimit.value;
  for (let i = limit - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dates.push(dateStr);
  }
  return dates;
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

    // Build a map of date -> rate value for quick lookup
    const recordsMap = {};
    if (data.records) {
      data.records.forEach((r) => {
        const dateStr =
          typeof r.date === 'string'
            ? r.date.split('T')[0]
            : new Date(r.date).toISOString().split('T')[0];
        
        const live = parseFloat(r.arcPerUnitLive) || 0;
        const base = parseFloat(r.arcPerUnitBase) || 0;

        if (chartMode.value === 'percentage') {
          recordsMap[dateStr] = base > 0 ? ((live - base) / base) * 100 : 0;
        } else {
          recordsMap[dateStr] = live;
        }
      });
    }

    // Align values with chartLabels, default to 0 if not present
    const rates = chartLabels.value.map((dateLabel) => {
      return recordsMap[dateLabel] !== undefined ? recordsMap[dateLabel] : 0;
    });

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
  onHover: (event, activeElements, chart) => {
    if (!chart) return;
    if (!activeElements || activeElements.length === 0) {
      chart._hoveredDatasetIndex = null;
      chart.data.datasets.forEach((dataset, idx) => {
        const baseColor = colorPalette[idx % colorPalette.length];
        dataset.borderColor = baseColor;
        dataset.borderWidth = 3;
        dataset.pointRadius = 2;
      });
      chart.update('none');
      return;
    }

    const mouseY = event.y;
    let closestIndex = null;
    let minDistance = Infinity;

    activeElements.forEach((el) => {
      if (el.element && typeof el.element.y === 'number') {
        const dist = Math.abs(el.element.y - mouseY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = el.datasetIndex;
        }
      }
    });

    const hasIntersect = minDistance <= 15;
    const hoveredIndex = hasIntersect ? closestIndex : null;

    chart._hoveredDatasetIndex = hoveredIndex;

    chart.data.datasets.forEach((dataset, idx) => {
      const baseColor = colorPalette[idx % colorPalette.length];
      if (hasIntersect) {
        if (hoveredIndex === idx) {
          dataset.borderColor = baseColor;
          dataset.borderWidth = 5;
          dataset.pointRadius = 4;
        } else {
          dataset.borderColor = baseColor + '33'; // Fade out to 20% opacity
          dataset.borderWidth = 1.5;
          dataset.pointRadius = 1;
        }
      } else {
        dataset.borderColor = baseColor;
        dataset.borderWidth = 3;
        dataset.pointRadius = 2;
      }
    });

    chart.update('none');
  },
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
      mode: 'index',
      intersect: false,
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      font: {
        family: 'Inter',
      },
      filter: function (tooltipItem) {
        const chart = tooltipItem.chart;
        if (!chart) return true;
        const hoveredIndex = chart._hoveredDatasetIndex;
        if (hoveredIndex !== undefined && hoveredIndex !== null) {
          return tooltipItem.datasetIndex === hoveredIndex;
        }
        return true;
      },
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) {
            if (chartMode.value === 'percentage') {
              label += (context.parsed.y >= 0 ? '+' : '') + context.parsed.y.toFixed(2) + '%';
            } else {
              label += `₳${context.parsed.y.toFixed(3)}`;
            }
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
          if (chartMode.value === 'percentage') {
            return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
          }
          return `₳${value.toFixed(2)}`;
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
        <!-- Chart Mode Toggle Buttons (Side-by-side Segmented Control) -->
        <div class="flex bg-slate-950 border border-slate-900 rounded-lg p-0.5 gap-0.5">
          <button
            @click="chartMode = 'raw'"
            :class="chartMode === 'raw' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer select-none"
          >
            Raw Rate (₳)
          </button>
          <button
            @click="chartMode = 'percentage'"
            :class="chartMode === 'percentage' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer select-none"
          >
            Compare to Base (%)
          </button>
        </div>

        <!-- Time Range Selector -->
        <select
          v-model="daysLimit"
          class="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
        >
          <option :value="7" class="bg-slate-950 text-slate-200">Last 7 Days</option>
          <option :value="15" class="bg-slate-950 text-slate-200">Last 15 Days</option>
          <option :value="30" class="bg-slate-950 text-slate-200">Last 30 Days</option>
          <option :value="60" class="bg-slate-950 text-slate-200">Last 60 Days</option>
          <option :value="90" class="bg-slate-950 text-slate-200">Last 90 Days</option>
          <option :value="120" class="bg-slate-950 text-slate-200">Last 120 Days</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div class="lg:col-span-1 border-r border-slate-800/50 pr-3 flex flex-col h-[350px]">
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2"
          >Compare Currencies</span
        >

        <div class="relative mb-3">
          <font-awesome-icon
            v-if="!searchQuery"
            icon="search"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs transition-opacity duration-200"
          />
          <font-awesome-icon
            v-else
            icon="rotate"
            spin
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 text-xs transition-opacity duration-200"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search currencies..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300 focus:border-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)]"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-all duration-200 hover:scale-110"
          >
            <font-awesome-icon icon="times" />
          </button>
        </div>

        <TransitionGroup
          tag="div"
          name="list-fade"
          class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2"
        >
          <div
            v-for="curr in filteredCurrencies"
            :key="curr.id"
            :id="'item-' + curr.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-950 transition-colors duration-150 cursor-pointer"
            @click="toggleSelection(curr.id)"
          >
            <input
              type="checkbox"
              :id="'check-' + curr.id"
              :value="curr.id"
              :checked="selectedCurrencies.includes(curr.id)"
              @change.stop
              class="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
            <span class="text-sm font-medium text-slate-300 select-none truncate">
              {{ curr.name }}
            </span>
          </div>
        </TransitionGroup>
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

/* Checklist item transition animations */
.list-fade-enter-active,
.list-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.list-fade-move {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
