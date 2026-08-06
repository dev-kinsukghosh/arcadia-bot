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
    const curr = props.currencies.find((c) => c.id === data.currencyId);
    const rates = chartLabels.value.map((dateLabel) => {
      return recordsMap[dateLabel] ?? curr?.baseRate ?? 0;
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
    class="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#11131c] p-6 shadow-xl backdrop-blur-md"
  >
    <div
      class="mb-6 flex flex-col justify-between gap-4 border-b border-slate-800/50 pb-4 md:flex-row md:items-center"
    >
      <div>
        <h2 class="flex items-center gap-2 text-xl font-semibold text-slate-100">
          <font-awesome-icon icon="chart-line" class="text-blue-500" />
          Currencies History Data Graph
        </h2>
        <p class="mt-1 text-xs text-slate-400">
          Track currency values and overlay multiple currencies side-by-side
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Chart Mode Toggle Buttons (Side-by-side Segmented Control) -->
        <div class="flex gap-0.5 rounded-lg border border-slate-900 bg-slate-950 p-0.5">
          <button
            :class="
              chartMode === 'raw'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            "
            class="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 select-none"
            @click="chartMode = 'raw'"
          >
            Raw Rate (₳)
          </button>
          <button
            :class="
              chartMode === 'percentage'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            "
            class="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 select-none"
            @click="chartMode = 'percentage'"
          >
            Compare to Base (%)
          </button>
        </div>

        <!-- Time Range Selector -->
        <select
          v-model="daysLimit"
          class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div class="flex h-[350px] flex-col border-r border-slate-800/50 pr-3 lg:col-span-1">
        <span class="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
          >Compare Currencies</span
        >

        <div class="relative mb-3">
          <font-awesome-icon
            v-if="!searchQuery"
            icon="search"
            class="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-slate-500 transition-opacity duration-200"
          />
          <font-awesome-icon
            v-else
            icon="rotate"
            spin
            class="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-blue-500 transition-opacity duration-200"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search currencies..."
            class="w-full rounded-lg border border-slate-800 bg-slate-950 px-8 py-1.5 text-xs text-slate-200 placeholder-slate-600 transition-all duration-300 focus:border-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            v-if="searchQuery"
            class="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-slate-500 transition-all duration-200 hover:scale-110 hover:text-slate-300"
            @click="searchQuery = ''"
          >
            <font-awesome-icon icon="times" />
          </button>
        </div>

        <TransitionGroup
          tag="div"
          name="list-fade"
          class="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1"
        >
          <div
            v-for="curr in filteredCurrencies"
            :id="'item-' + curr.id"
            :key="curr.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-slate-950"
            @click="toggleSelection(curr.id)"
          >
            <input
              :id="'check-' + curr.id"
              type="checkbox"
              :value="curr.id"
              :checked="selectedCurrencies.includes(curr.id)"
              class="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              @change.stop
            />
            <span class="truncate text-sm font-medium text-slate-300 select-none">
              {{ curr.name }}
            </span>
          </div>
        </TransitionGroup>
      </div>

      <div class="relative h-80 lg:col-span-3">
        <div
          v-if="isLoading"
          class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#11131c]/60 backdrop-blur-xs"
        >
          <div class="flex flex-col items-center gap-3">
            <font-awesome-icon icon="rotate" spin class="text-3xl text-blue-500" />
            <span class="text-xs font-semibold text-slate-400">Loading historical data...</span>
          </div>
        </div>

        <div
          v-if="selectedCurrencies.length === 0"
          class="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 p-6 text-center"
        >
          <font-awesome-icon icon="sliders" class="mb-3 text-4xl text-slate-600" />
          <h4 class="text-sm font-semibold text-slate-300">No Currencies Selected</h4>
          <p class="mt-1 max-w-70 text-xs text-slate-500">
            Select one or more currencies on the left to display historical charts.
          </p>
        </div>

        <div v-else class="size-full">
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
